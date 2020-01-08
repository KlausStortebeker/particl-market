// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Bookshelf from 'bookshelf';
import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { validate, request } from '../../../core/api/Validate';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { ValidationException } from '../../exceptions/ValidationException';
import { ItemInformationRepository } from '../../repositories/ItemInformationRepository';
import { ItemInformation } from '../../models/ItemInformation';
import { ItemInformationCreateRequest } from '../../requests/model/ItemInformationCreateRequest';
import { ItemInformationUpdateRequest } from '../../requests/model/ItemInformationUpdateRequest';
import { ItemLocationService } from './ItemLocationService';
import { ItemImageService } from './ItemImageService';
import { ShippingDestinationService } from './ShippingDestinationService';
import { ItemCategoryService } from './ItemCategoryService';
import { ItemCategory } from '../../models/ItemCategory';
import { ItemCategoryCreateRequest } from '../../requests/model/ItemCategoryCreateRequest';

export class ItemInformationService {

    public log: LoggerType;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ItemCategoryService) public itemCategoryService: ItemCategoryService,
        @inject(Types.Service) @named(Targets.Service.model.ItemImageService) public itemImageService: ItemImageService,
        @inject(Types.Service) @named(Targets.Service.model.ShippingDestinationService) public shippingDestinationService: ShippingDestinationService,
        @inject(Types.Service) @named(Targets.Service.model.ItemLocationService) public itemLocationService: ItemLocationService,
        @inject(Types.Repository) @named(Targets.Repository.ItemInformationRepository) public itemInformationRepo: ItemInformationRepository,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    public async findAll(): Promise<Bookshelf.Collection<ItemInformation>> {
        return this.itemInformationRepo.findAll();
    }

    public async findOne(id: number, withRelated: boolean = true): Promise<ItemInformation> {
        const itemInformation = await this.itemInformationRepo.findOne(id, withRelated);
        if (itemInformation === null) {
            this.log.warn(`ItemInformation with the id=${id} was not found!`);
            throw new NotFoundException(id);
        }
        return itemInformation;
    }

    public async findByListingItemTemplateId(listingItemTemplateId: number, withRelated: boolean = true): Promise<ItemInformation> {
        const itemInformation = await this.itemInformationRepo.findByItemTemplateId(listingItemTemplateId, withRelated);
        if (itemInformation === null) {
            this.log.warn(`ItemInformation with the listingItemTemplateId=${listingItemTemplateId} was not found!`);
            throw new NotFoundException(listingItemTemplateId);
        }
        return itemInformation;
    }

    @validate()
    public async create( @request(ItemInformationCreateRequest) data: ItemInformationCreateRequest): Promise<ItemInformation> {
        const startTime = new Date().getTime();

        const body: ItemInformationCreateRequest = JSON.parse(JSON.stringify(data));

        // this.log.debug('create itemInformation, body: ', JSON.stringify(body, null, 2));

        // ItemInformation needs to be related to either one
        if (body.listing_item_id == null && body.listing_item_template_id == null) {
            throw new ValidationException('Request body is not valid', ['listing_item_id or listing_item_template_id missing']);
        }

        // extract and remove related models from request
        const itemCategory = body.itemCategory;
        const itemLocation = body.itemLocation;
        const shippingDestinations = body.shippingDestinations || [];
        const itemImages = body.itemImages || [];
        delete body.itemCategory;
        delete body.itemLocation;
        delete body.shippingDestinations;
        delete body.itemImages;

        if (!body.item_category_id) {
            // get existing ItemCategory or create new one
            const existingItemCategory = await this.getOrCreateItemCategory(itemCategory);
            body.item_category_id = existingItemCategory.Id;
        }

        // ready to save, if the request body was valid, create the itemInformation
        const itemInformation = await this.itemInformationRepo.create(body);

        // create related models
        if (!_.isEmpty(itemLocation)) {
            itemLocation.item_information_id = itemInformation.Id;
            await this.itemLocationService.create(itemLocation);
        }

        if (shippingDestinations) {
            for (const shippingDestination of shippingDestinations) {
                shippingDestination.item_information_id = itemInformation.Id;
                await this.shippingDestinationService.create(shippingDestination);
            }
        }

        if (itemImages) {
            for (const itemImage of itemImages) {
                itemImage.item_information_id = itemInformation.Id;
                // this.log.debug('itemImage: ', JSON.stringify(itemImage, null, 2));
                await this.itemImageService.create(itemImage);
            }
        }

        // finally find and return the created itemInformation
        const result = await this.findOne(itemInformation.Id);
        // this.log.debug('itemInformationService.create: ' + (new Date().getTime() - startTime) + 'ms');

        return result;
    }

    @validate()
    public async update(id: number, @request(ItemInformationUpdateRequest) data: ItemInformationUpdateRequest): Promise<ItemInformation> {

        const body = JSON.parse(JSON.stringify(data));
        // this.log.debug('updating ItemInformation, body: ', JSON.stringify(body, null, 2));

        if (body.listing_item_id == null && body.listing_item_template_id == null) {
            throw new ValidationException('Request body is not valid', ['listing_item_id or listing_item_template_id missing']);
        }

        // find the existing one without related
        const itemInformation = await this.findOne(id, false);

        // set new values
        itemInformation.Title = body.title;
        itemInformation.ShortDescription = body.shortDescription;
        itemInformation.LongDescription = body.longDescription;
        const itemInfoToSave = itemInformation.toJSON();

        // get existing item category or create new one
        const existingItemCategory = await this.getOrCreateItemCategory(body.itemCategory);
        itemInfoToSave.item_category_id = existingItemCategory.Id;

        // update itemInformation record
        const updatedItemInformation = await this.itemInformationRepo.update(id, itemInfoToSave);

        if (body.itemLocation) {
            // find related record and delete it
            let itemLocation = updatedItemInformation.related('ItemLocation').toJSON();
            await this.itemLocationService.destroy(itemLocation.id);
            // recreate related data
            itemLocation = body.itemLocation;
            itemLocation.item_information_id = id;
            await this.itemLocationService.create(itemLocation);
        }

        // todo: instead of delete and create, update

        // find related record and delete it
        let shippingDestinations = updatedItemInformation.related('ShippingDestinations').toJSON();
        for (const shippingDestination of shippingDestinations) {
            await this.shippingDestinationService.destroy(shippingDestination.id);
        }

        // recreate related data
        shippingDestinations = body.shippingDestinations || [];
        for (const shippingDestination of shippingDestinations) {
            shippingDestination.item_information_id = id;
            await this.shippingDestinationService.create(shippingDestination);
        }

        // finally find and return the updated itemInformation
        const newItemInformation = await this.findOne(id);
        return newItemInformation;
    }

    public async destroy(id: number): Promise<void> {
        const itemImage: resources.ItemImage = await this.findOne(id, true).then(value => value.toJSON());
        // find the existing one without related
        const itemInformation: resources.ItemInformation = await this.findOne(id, true).then(value => value.toJSON());

        // manually remove images
        for (const image of itemInformation.ItemImages) {
            await this.itemImageService.destroy(image.id);
        }
        await this.itemInformationRepo.destroy(id);
    }

    /**
     * fetch or create the given ItemCategory from db
     * @returns {Promise<ItemCategory>}
     * @param createRequest
     */
    private async getOrCreateItemCategory(createRequest: ItemCategoryCreateRequest): Promise<ItemCategory> {
        let result;
        if (createRequest.key) {
            result = await this.itemCategoryService.findOneByKey(createRequest.key);
        } else if (createRequest.id) {
            result = await this.itemCategoryService.findOne(createRequest.id);
        } else {
            result = await this.itemCategoryService.create(createRequest);
        }

        return result;
    }

}
