// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Bookshelf from 'bookshelf';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { validate, request } from '../../../core/api/Validate';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { ItemImageRepository } from '../../repositories/ItemImageRepository';
import { ItemImage } from '../../models/ItemImage';
import { ItemImageCreateRequest } from '../../requests/model/ItemImageCreateRequest';
import { ItemImageDataCreateRequest } from '../../requests/model/ItemImageDataCreateRequest';
import { ItemImageUpdateRequest } from '../../requests/model/ItemImageUpdateRequest';
import { ItemImageDataService } from './ItemImageDataService';
import { ImageFactory } from '../../factories/ImageFactory';
import { ImageVersions } from '../../../core/helpers/ImageVersionEnumType';
import { MessageException } from '../../exceptions/MessageException';
import { ItemImageDataRepository } from '../../repositories/ItemImageDataRepository';
import { ProtocolDSN } from 'omp-lib/dist/interfaces/dsn';
import { ConfigurableHasher } from 'omp-lib/dist/hasher/hash';
import { HashableItemImageCreateRequestConfig } from '../../factories/hashableconfig/createrequest/HashableItemImageCreateRequestConfig';

export class ItemImageService {

    public log: LoggerType;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ItemImageDataService) public itemImageDataService: ItemImageDataService,
        @inject(Types.Repository) @named(Targets.Repository.ItemImageRepository) public itemImageRepo: ItemImageRepository,
        @inject(Types.Repository) @named(Targets.Repository.ItemImageDataRepository) public itemImageDataRepo: ItemImageDataRepository,
        @inject(Types.Factory) @named(Targets.Factory.ImageFactory) public imageFactory: ImageFactory,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    public async findAll(): Promise<Bookshelf.Collection<ItemImage>> {
        return this.itemImageRepo.findAll();
    }

    public async findOne(id: number, withRelated: boolean = true): Promise<ItemImage> {
        const itemImage = await this.itemImageRepo.findOne(id, withRelated);
        if (itemImage === null) {
            this.log.warn(`ItemImage with the id=${id} was not found!`);
            throw new NotFoundException(id);
        }
        return itemImage;
    }

    /**
     * create(), but get data from a local file instead.
     * used to create the ORIGINAL image version from the uploaded file
     *
     * @param imageFile
     * @param itemInformationId
     * @returns {Promise<ItemImage>}
     */
    @validate()
    public async createFromFile(imageFile: any, itemInformationId: number): Promise<ItemImage> {
        // TODO: ADD TYPE TO imageFile!!

        const dataStr = fs.readFileSync(imageFile.path, 'base64');

        const itemImageDataCreateRequest = {
            dataId: imageFile.fieldname, // replaced with local url in factory
            protocol: ProtocolDSN.LOCAL,
            imageVersion: ImageVersions.ORIGINAL.propName,
            encoding: 'BASE64',
            data: dataStr,
            originalMime: imageFile.mimetype,
            originalName: imageFile.originalname
        } as ItemImageDataCreateRequest;

        const itemImageCreateRequest = {
            item_information_id: itemInformationId,
            data: [itemImageDataCreateRequest]
        } as ItemImageCreateRequest;

        return await this.create(itemImageCreateRequest);
    }

    /**
     * creates multiple different version of given image
     *
     * @param data
     */
    @validate()
    public async create( @request(ItemImageCreateRequest) data: ItemImageCreateRequest): Promise<ItemImage> {

        // const startTime = new Date().getTime();
        const body = JSON.parse(JSON.stringify(data));

        // this.log.debug('body: ', JSON.stringify(body, null, 2));

        // get the existing ItemImageDatas
        const itemImageDatas: ItemImageDataCreateRequest[] = body.data;
        // get the original out of those
        const itemImageDataOriginal = _.find(itemImageDatas, (imageData) => {
            return imageData.imageVersion === ImageVersions.ORIGINAL.propName;
        });

        // remove ItemImageDatas from the body
        delete body.data;

        if (itemImageDataOriginal) { // the original should always exist, its used to create the other versions

            // TODO: create a factory for the ItemImageCreateRequest and move hashing there
            // use the original image version to create a hash for the ItemImage
            body.hash = ConfigurableHasher.hash(itemImageDataOriginal, new HashableItemImageCreateRequestConfig());

            // get all protocols
            const protocols = Object.keys(ProtocolDSN).map(key => (ProtocolDSN[key]));

            if (_.isEmpty(itemImageDataOriginal.protocol) ||  protocols.indexOf(itemImageDataOriginal.protocol) === -1) {
                this.log.warn(`Invalid protocol <${itemImageDataOriginal.protocol}> encountered.`);
                throw new MessageException('Invalid image protocol.');
            }

            if (_.isEmpty(itemImageDataOriginal.data)) {
                throw new MessageException('Image data not found.');
            }

            // create the ItemImage
            const itemImage = await this.itemImageRepo.create(body);

            // then create the other imageDatas from the given original data,
            // original is automatically added as one of the versions
            const toVersions = [ImageVersions.LARGE, ImageVersions.MEDIUM, ImageVersions.THUMBNAIL];
            const imageDatas: ItemImageDataCreateRequest[] = await this.imageFactory.getImageDatas(
                itemImage.Id, itemImage.Hash, itemImageDataOriginal, toVersions);

            // save all ItemImageDatas
            for (const imageData of imageDatas) {
                // const fileName = await this.itemImageDataService.saveImageFile(imageData.data, body.hash, imageData.imageVersion);
                // imageData.data = fileName;

                await this.itemImageDataService.create(imageData);
            }

            // finally find and return the created itemImage
            const newItemImage = await this.findOne(itemImage.Id);
            // this.log.debug('saved image:', JSON.stringify(newItemImage.toJSON(), null, 2));

            // this.log.debug('itemImageService.create: ' + (new Date().getTime() - startTime) + 'ms');
            return newItemImage;
        } else {
            throw new MessageException('Original image data not found.');
        }
    }

    @validate()
    public async update(id: number, @request(ItemImageUpdateRequest) data: ItemImageUpdateRequest): Promise<ItemImage> {

        const startTime = new Date().getTime();
        const body = JSON.parse(JSON.stringify(data));

        // grab the existing imagedatas
        const itemImageDatas: ItemImageDataCreateRequest[] = body.data;
        // get the original out of those
        const itemImageDataOriginal = _.find(itemImageDatas, (imageData) => {
            return imageData.imageVersion === ImageVersions.ORIGINAL.propName;
        });

        delete body.data;

        const itemImage = await this.findOne(id, false);

        if (itemImageDataOriginal) {

            // use the original image version to create a hash for the ItemImage
            body.hash = ConfigurableHasher.hash(itemImageDataOriginal, new HashableItemImageCreateRequestConfig());

            // get all protocols
            const protocols = Object.keys(ProtocolDSN).map(key => (ProtocolDSN[key]));

            if (_.isEmpty(itemImageDataOriginal.protocol) || protocols.indexOf(itemImageDataOriginal.protocol) === -1) {
                this.log.warn(`Invalid protocol <${itemImageDataOriginal.protocol}> encountered.`);
                throw new MessageException('Invalid image protocol.');
            }

            if (_.isEmpty(itemImageDataOriginal.data)) {
                throw new MessageException('Image data not found.');
            }

            // set new values
            itemImage.Hash = body.hash;
            itemImage.Featured = body.featured;

            // update itemImage record
            const updatedItemImageModel = await this.itemImageRepo.update(id, itemImage.toJSON());
            const updatedItemImage: resources.ItemImage = updatedItemImageModel.toJSON();

            // find and remove old related ItemImageDatas and files
            for (const imageData of updatedItemImage.ItemImageDatas) {
                await this.itemImageDataService.destroy(imageData.id);
            }

            // then recreate the other imageDatas from the given original data
            const toVersions = [ImageVersions.LARGE, ImageVersions.MEDIUM, ImageVersions.THUMBNAIL];
            const imageDatas: ItemImageDataCreateRequest[] = await this.imageFactory.getImageDatas(
                itemImage.Id, itemImage.Hash, itemImageDataOriginal, toVersions);

            // save all ItemImageDatas
            for (const imageData of imageDatas) {
                await this.itemImageDataService.create(imageData);
            }

            // finally find and return the created itemImage
            const newItemImage = await this.findOne(itemImage.Id);
            // this.log.debug('saved image:', JSON.stringify(newItemImage.toJSON(), null, 2));

            this.log.debug('itemImageService.update: ' + (new Date().getTime() - startTime) + 'ms');
            return newItemImage;

        } else {
            throw new MessageException('Original image data not found.');
        }
    }

    public async updateFeatured(imageId: number, featured: boolean): Promise<ItemImage> {
        const data = {
            featured
        } as ItemImageUpdateRequest;
        return await this.itemImageRepo.update(imageId, data);
    }

    public async destroy(id: number): Promise<void> {
        const itemImage: resources.ItemImage = await this.findOne(id, true).then(value => value.toJSON());
        this.log.debug('destroy(), remove image, hash: ', itemImage.hash);

        // find and remove ItemImageDatas and files
        for (const imageData of itemImage.ItemImageDatas) {
            await this.itemImageDataService.destroy(imageData.id);
        }

        await this.itemImageRepo.destroy(id);
    }
}
