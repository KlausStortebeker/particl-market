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
import { MessageException } from '../../exceptions/MessageException';
import { ListingItemTemplate } from '../../models/ListingItemTemplate';
import { ListingItemTemplateRepository } from '../../repositories/ListingItemTemplateRepository';
import { ListingItemTemplateSearchParams } from '../../requests/search/ListingItemTemplateSearchParams';
import { ListingItemTemplateCreateRequest } from '../../requests/model/ListingItemTemplateCreateRequest';
import { ListingItemTemplateUpdateRequest } from '../../requests/model/ListingItemTemplateUpdateRequest';
import { ItemInformationCreateRequest } from '../../requests/model/ItemInformationCreateRequest';
import { ItemInformationUpdateRequest } from '../../requests/model/ItemInformationUpdateRequest';
import { PaymentInformationCreateRequest } from '../../requests/model/PaymentInformationCreateRequest';
import { PaymentInformationUpdateRequest } from '../../requests/model/PaymentInformationUpdateRequest';
import { MessagingInformationCreateRequest } from '../../requests/model/MessagingInformationCreateRequest';
import { MessagingInformationUpdateRequest } from '../../requests/model/MessagingInformationUpdateRequest';
import { ListingItemObjectCreateRequest } from '../../requests/model/ListingItemObjectCreateRequest';
import { ListingItemObjectUpdateRequest } from '../../requests/model/ListingItemObjectUpdateRequest';
import { ImageVersions } from '../../../core/helpers/ImageVersionEnumType';
import { ImageProcessing } from '../../../core/helpers/ImageProcessing';
import { ItemImageDataCreateRequest } from '../../requests/model/ItemImageDataCreateRequest';
import { MessageSize } from '../../responses/MessageSize';
import { ListingItemFactory } from '../../factories/model/ListingItemFactory';
import { ImageFactory } from '../../factories/ImageFactory';
import { ItemImage } from '../../models/ItemImage';
import { ompVersion} from 'omp-lib/dist/omp';
import { ListingItemAddMessageFactory } from '../../factories/message/ListingItemAddMessageFactory';
import { MarketplaceMessage } from '../../messages/MarketplaceMessage';
import { ItemInformationService } from './ItemInformationService';
import { ItemImageDataService } from './ItemImageDataService';
import { ItemImageService } from './ItemImageService';
import { PaymentInformationService } from './PaymentInformationService';
import { MessagingInformationService } from './MessagingInformationService';
import { ListingItemObjectService } from './ListingItemObjectService';
import { ListingItemAddMessageCreateParams } from '../../requests/message/ListingItemAddMessageCreateParams';
import { ModelNotModifiableException } from '../../exceptions/ModelNotModifiableException';
import { ShippingPriceCreateRequest } from '../../requests/model/ShippingPriceCreateRequest';
import { ItemPriceCreateRequest } from '../../requests/model/ItemPriceCreateRequest';
import { EscrowRatioCreateRequest } from '../../requests/model/EscrowRatioCreateRequest';
import { EscrowCreateRequest } from '../../requests/model/EscrowCreateRequest';
import { ShippingDestinationCreateRequest } from '../../requests/model/ShippingDestinationCreateRequest';
import { ItemImageCreateRequest } from '../../requests/model/ItemImageCreateRequest';
import { ItemLocationCreateRequest } from '../../requests/model/ItemLocationCreateRequest';
import { LocationMarkerCreateRequest } from '../../requests/model/LocationMarkerCreateRequest';
import { ListingItemObjectDataCreateRequest } from '../../requests/model/ListingItemObjectDataCreateRequest';
import {MessagingInformation} from '../../models/MessagingInformation';

export class ListingItemTemplateService {

    public static MAX_SMSG_SIZE = 524288;  // https://github.com/particl/particl-core/blob/master/src/smsg/smessage.h#L78

    private static IMG_BOUNDING_WIDTH = 600;
    private static IMG_BOUNDING_HEIGHT = 600;
    private static FRACTION_LOWEST_COMPRESSION = 0.8;

    public log: LoggerType;

    constructor(
        @inject(Types.Repository) @named(Targets.Repository.ListingItemTemplateRepository) public listingItemTemplateRepo: ListingItemTemplateRepository,
        @inject(Types.Service) @named(Targets.Service.model.ItemInformationService) public itemInformationService: ItemInformationService,
        @inject(Types.Service) @named(Targets.Service.model.ItemImageDataService) public itemImageDataService: ItemImageDataService,
        @inject(Types.Service) @named(Targets.Service.model.ItemImageService) public itemImageService: ItemImageService,
        @inject(Types.Service) @named(Targets.Service.model.PaymentInformationService) public paymentInformationService: PaymentInformationService,
        @inject(Types.Service) @named(Targets.Service.model.MessagingInformationService) public messagingInformationService: MessagingInformationService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemObjectService) public listingItemObjectService: ListingItemObjectService,
        @inject(Types.Factory) @named(Targets.Factory.model.ListingItemFactory) private listingItemFactory: ListingItemFactory,
        @inject(Types.Factory) @named(Targets.Factory.message.ListingItemAddMessageFactory) private listingItemAddMessageFactory: ListingItemAddMessageFactory,
        @inject(Types.Factory) @named(Targets.Factory.ImageFactory) private imageFactory: ImageFactory,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    public async findAll(): Promise<Bookshelf.Collection<ListingItemTemplate>> {
        return this.listingItemTemplateRepo.findAll();
    }

    public async findOne(id: number, withRelated: boolean = true): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.listingItemTemplateRepo.findOne(id, withRelated);
        if (listingItemTemplate === null) {
            this.log.warn(`ListingItemTemplate with the id=${id} was not found!`);
            throw new NotFoundException(id);
        }
        return listingItemTemplate;
    }

    /**
     *
     * @param {string} hash
     * @param {boolean} withRelated
     * @returns {Promise<ListingItemTemplate>}
     */
    public async findOneByHash(hash: string, withRelated: boolean = true): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.listingItemTemplateRepo.findOneByHash(hash, withRelated);
        if (listingItemTemplate === null) {
            this.log.warn(`ListingItemTemplate with the hash=${hash} was not found!`);
            throw new NotFoundException(hash);
        }
        return listingItemTemplate;
    }

    /**
     * TODO: test
     * @param templateId
     * @param market
     */
    public async findLatestByParentTemplateAndMarket(templateId: number, market: string): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.listingItemTemplateRepo.findLatestByParentTemplateAndMarket(templateId, market);
        if (listingItemTemplate === null) {
            this.log.warn(`ListingItemTemplate with the templateId=${templateId} and market=${market} was not found!`);
            throw new NotFoundException(templateId);
        }
        return listingItemTemplate;
    }

    /**
     * TODO: test
     * @param templateId
     * @param market
     */
    public async findAllVersionsByParentTemplateAndMarket(templateId: number, market: string): Promise<Bookshelf.Collection<ListingItemTemplate>> {
        return await this.listingItemTemplateRepo.findAllVersionsByParentTemplateAndMarket(templateId, market);
    }

    /**
     * searchBy ListingItemTemplates using given ListingItemTemplateSearchParams
     *
     * @param options
     * @returns {Promise<Bookshelf.Collection<ListingItemTemplate>>}
     */
    public async search(options: ListingItemTemplateSearchParams): Promise<Bookshelf.Collection<ListingItemTemplate>> {
        return await this.listingItemTemplateRepo.search(options);
    }

    @validate()
    public async create( @request(ListingItemTemplateCreateRequest) data: ListingItemTemplateCreateRequest): Promise<ListingItemTemplate> {
        // this.log.debug('listingItemTemplate, data:', JSON.stringify(data, null, 2));
        const body: ListingItemTemplateCreateRequest = JSON.parse(JSON.stringify(data));

        // extract and remove related models from request
        const itemInformation = body.itemInformation;
        delete body.itemInformation;
        const paymentInformation = body.paymentInformation;
        delete body.paymentInformation;
        const messagingInformation = body.messagingInformation || [];
        delete body.messagingInformation;
        const listingItemObjects = body.listingItemObjects || [];
        delete body.listingItemObjects;

        // then create the listingItemTemplate
        const listingItemTemplate: resources.ListingItemTemplate = await this.listingItemTemplateRepo.create(body).then(value => value.toJSON());

        // TODO
        // if there is no parent template -> this is the base template -> there should be no market
        // if there is no parent template, but market was given -> create the base template and then create a new market version

        // for now, we dont require templates to have markets and only allow default categories

        // create related models
        if (!_.isEmpty(itemInformation)) {
            itemInformation.listing_item_template_id = listingItemTemplate.id;
            const createdItemInfo: resources.ItemInformation = await this.itemInformationService.create(itemInformation)
                .then(value => value.toJSON());
            // this.log.debug('itemInformation, result:', JSON.stringify(result, null, 2));
        }

        if (!_.isEmpty(paymentInformation)) {
            paymentInformation.listing_item_template_id = listingItemTemplate.id;
            const createdPaymentInfo: resources.PaymentInformation = await this.paymentInformationService.create(paymentInformation)
                .then(value => value.toJSON());
            // this.log.debug('paymentInformation, result:', JSON.stringify(result, null, 2));
        }

        if (!_.isEmpty(messagingInformation)) {
            for (const msgInfo of messagingInformation) {
                msgInfo.listing_item_template_id = listingItemTemplate.id;
                const createdMsgInfo: resources.MessagingInformation = await this.messagingInformationService.create(msgInfo)
                    .then(value => value.toJSON());
                // this.log.debug('msgInfo, result:', JSON.stringify(result, null, 2));
            }
        }

        if (!_.isEmpty(listingItemObjects)) {
            for (const object of listingItemObjects) {
                object.listing_item_template_id = listingItemTemplate.id;
                const createdListingItemObject: resources.ListingItemObject = await this.listingItemObjectService.create(object)
                    .then(value => value.toJSON());
                // this.log.debug('object, result:', JSON.stringify(result, null, 2));
            }
        }

        return await this.findOne(listingItemTemplate.id);
    }

    /**
     * clone a ListingItemTemplate
     *
     * @param id
     * @param setOriginalAsParent
     * @param newMarket
     */
    public async clone(id: number, setOriginalAsParent: boolean = false, newMarket?: string): Promise<ListingItemTemplate> {
        let listingItemTemplate: resources.ListingItemTemplate = await this.findOne(id, true).then(value => value.toJSON());
        const createRequest = await this.getCloneCreateRequest(listingItemTemplate, setOriginalAsParent, newMarket);
        listingItemTemplate = await this.create(createRequest).then(value => value.toJSON());
        return await this.findOne(listingItemTemplate.id);
    }

    @validate()
    public async update(id: number, @request(ListingItemTemplateUpdateRequest) data: ListingItemTemplateUpdateRequest): Promise<ListingItemTemplate> {
        const body = JSON.parse(JSON.stringify(data));

        // find the existing one without related
        const listingItemTemplate = await this.findOne(id, false);

        // ListingItemTemplates with a hash or ListingItems are not supposed to be modified anymore
        if (!_.isEmpty(listingItemTemplate.Hash) || !_.isEmpty(listingItemTemplate.ListingItems)) {
            throw new ModelNotModifiableException('ListingItemTemplate');
        }

        // update listingItemTemplate record
        // todo: ListingItemTemplate has no changeable data?
        const updatedListingItemTemplate = await this.listingItemTemplateRepo.update(id, listingItemTemplate.toJSON());

        // if the related one exists already, then update. if it doesnt exist, create. and if the related one is missing, then remove.
        const itemInformation: resources.ItemInformation = updatedListingItemTemplate.related('ItemInformation').toJSON()
            || {} as resources.ItemInformation;

        if (!_.isEmpty(body.itemInformation)) {
            // we want to add/update
            if (!_.isEmpty(itemInformation)) {
                // already exists
                const updateRequest: ItemInformationUpdateRequest = body.itemInformation;
                //  updateRequest.listing_item_template_id = id;
                this.log.debug('updateRequest: ', JSON.stringify(updateRequest, null, 2));
                await this.itemInformationService.update(itemInformation.id, updateRequest);
            } else {
                // doesnt exist
                const createRequest: ItemInformationCreateRequest = body.itemInformation;
                createRequest.listing_item_template_id = id;
                this.log.debug('createRequest: ', JSON.stringify(createRequest, null, 2));
                await this.itemInformationService.create(createRequest);
            }
        } else if (!_.isEmpty(itemInformation)) {
            // we want to remove
            // already exists
            await this.itemInformationService.destroy(itemInformation.id);
        }

        // if the related one exists already, then update. if it doesnt exist, create. and if the related one is missing, then remove.
        const paymentInformation: resources.PaymentInformation = updatedListingItemTemplate.related('PaymentInformation').toJSON()
            || {} as resources.PaymentInformation;

        if (!_.isEmpty(body.paymentInformation)) {
            // we want to add/update
            if (!_.isEmpty(paymentInformation)) {
                // already exists
                const updateRequest: PaymentInformationUpdateRequest = body.paymentInformation;
                await this.paymentInformationService.update(paymentInformation.id, updateRequest);
            } else {
                // doesnt exist
                const createRequest: PaymentInformationCreateRequest = body.paymentInformation;
                createRequest.listing_item_template_id = id;
                await this.paymentInformationService.create(createRequest);
            }
        } else if (!_.isEmpty(paymentInformation)) {
            // we want to remove
            // already exists
            await this.paymentInformationService.destroy(paymentInformation.id);
        }

        // ---
        const existingMessagingInformations: resources.MessagingInformation[] = updatedListingItemTemplate.related('MessagingInformation').toJSON()
            || [] as resources.MessagingInformation[];
        const newMessagingInformations = body.messagingInformation || [];

        // delete existing MessagingInformation if its not included in the newMessagingInformations
        for (const msgInfo of existingMessagingInformations) {
            // is existing part of new ones?
            const found = await this.checkExistingObjectFieldValueExistsInArray<MessagingInformationUpdateRequest>(
                newMessagingInformations, 'id', msgInfo.id);
            if (_.isEmpty(found)) {
                // not found -> delete
                await this.messagingInformationService.destroy(msgInfo.id);
            }
        }

        // create new or update existing MessagingInformations
        for (const newMsgInfo of newMessagingInformations) {

            if (newMsgInfo.id !== undefined) {
                // id exists -> update
                newMsgInfo.listing_item_template_id = id;
                await this.messagingInformationService.update(newMsgInfo.id, newMsgInfo);
            } else {
                newMsgInfo.listing_item_template_id = id;
                await this.messagingInformationService.create(newMsgInfo);
            }
        }

        // ---
        const existingListingItemObjects: resources.ListingItemObject[] = updatedListingItemTemplate.related('ListingItemObjects').toJSON()
            || [] as resources.ListingItemObject[];
        const newListingItemObjects = body.listingItemObjects || [];

        // delete existing ListingItemObject if its not included in the newListingItemObjects
        for (const liObject of existingListingItemObjects) {
            // is existing part of new ones?
            const found = await this.checkExistingObjectFieldValueExistsInArray<ListingItemObjectUpdateRequest>(
                newListingItemObjects, 'id', liObject.id);
            if (_.isEmpty(found)) {
                // not found -> delete
                await this.listingItemObjectService.destroy(liObject.id);
            }
        }

        // create or update listingItemObjects
        for (const newLiObject of newListingItemObjects) {
            if (newLiObject.id !== undefined) {
                newLiObject.listing_item_template_id = id;
                await this.listingItemObjectService.update(newLiObject.id, newLiObject);
            } else {
                newLiObject.listing_item_template_id = id;
                await this.listingItemObjectService.create(newLiObject as ListingItemObjectCreateRequest);
            }
        }

        // finally find and return the updated listingItem
        return await this.findOne(id);
    }

    public async destroy(id: number): Promise<void> {
        const listingItemTemplate: resources.ListingItemTemplate = await this.findOne(id).then(value => value.toJSON());

        if (!_.isEmpty(listingItemTemplate.ListingItems)) {
            throw new MessageException('ListingItemTemplate has ListingItems.');
        }

        // manually remove images
        if (!_.isEmpty(listingItemTemplate.ItemInformation.ItemImages)) {
            for (const image of listingItemTemplate.ItemInformation.ItemImages) {
                await this.itemImageService.destroy(image.id);
            }
        }

        this.log.debug('deleting listingItemTemplate:', listingItemTemplate.id);
        await this.listingItemTemplateRepo.destroy(id);
    }

    public async updateHash(id: number, hash: string): Promise<ListingItemTemplate> {
        const listingItemTemplate = await this.findOne(id, false);
        listingItemTemplate.Hash = hash;
        const updated = await this.listingItemTemplateRepo.update(id, listingItemTemplate.toJSON());
        this.log.debug('updated ListingItemTemplate ' + id + ' hash to: ' + updated.Hash);
        return updated;
    }

    public async isModifiable(id: number): Promise<boolean> {
        const listingItemTemplate: resources.ListingItemTemplate = await this.findOne(id, true).then(value => value.toJSON());

        // ListingItemTemplates which have a related ListingItems or ChildListingItems can not be modified
        // this.log.debug('listingItemTemplate.ListingItems: ' + listingItemTemplate.ListingItems);
        // this.log.debug('listingItemTemplate.ChildListingItemTemplate: ' + listingItemTemplate.ChildListingItemTemplate);

        // const isModifiable = (_.isEmpty(listingItemTemplate.ListingItems) && _.isEmpty(listingItemTemplate.ChildListingItemTemplate));

        // template is modifiable if it hasn't been posted, and it hasnt been posted unless it has a hash
        const isModifiable = listingItemTemplate.hash === undefined;

        this.log.debug('isModifiable: ' + isModifiable);
        return isModifiable;
    }

    /**
     * creates resized versions of the template images, so that all of them fit in one smsgmessage
     *
     * @param {"resources".ListingItemTemplate} listingItemTemplate
     * @returns {Promise<"resources".ListingItemTemplate>}
     */
    public async createResizedTemplateImages(listingItemTemplate: resources.ListingItemTemplate): Promise<ListingItemTemplate> {
        const startTime = new Date().getTime();

        // ItemInformation has ItemImages, which is an array.
        const itemImages = listingItemTemplate.ItemInformation.ItemImages;
        const originalImageDatas: resources.ItemImageData[] = [];

        for (const itemImage of itemImages) {
            const itemImageDataOriginal: resources.ItemImageData | undefined = _.find(itemImage.ItemImageDatas, (imageData) => {
                return imageData.imageVersion === ImageVersions.ORIGINAL.propName;
            });
            const itemImageDataResized: resources.ItemImageData | undefined = _.find(itemImage.ItemImageDatas, (imageData) => {
                return imageData.imageVersion === ImageVersions.RESIZED.propName;
            });

            if (!itemImageDataOriginal) {
                // there's something wrong with the ItemImage if original image doesnt have data
                throw new MessageException('Error while resizing: Original image data not found.');
            }

            if (!itemImageDataResized) {
                // Only need to process if the resized image does not exist
                originalImageDatas.push(itemImageDataOriginal);
            }
        }

        for (const originalImageData of originalImageDatas) {
            const compressedImage = await this.getResizedImage(originalImageData.imageHash, ListingItemTemplateService.FRACTION_LOWEST_COMPRESSION * 100);
            // save the resized image
            const imageDataCreateRequest: ItemImageDataCreateRequest = await this.imageFactory.getImageDataCreateRequest(
                originalImageData.itemImageId, ImageVersions.RESIZED, originalImageData.imageHash, originalImageData.protocol, compressedImage,
                originalImageData.encoding, originalImageData.originalMime, originalImageData.originalName);
            await this.itemImageDataService.create(imageDataCreateRequest);
        }

        this.log.debug('listingItemTemplateService.createResizedTemplateImages: ' + (new Date().getTime() - startTime) + 'ms');

        return await this.findOne(listingItemTemplate.id);
    }

    /**
     * calculates the size of the MarketplaceMessage for given ListingItemTemplate.
     * used to determine whether the MarketplaceMessage fits in the SmsgMessage size limits.
     *
     * @param listingItemTemplate
     */
    // TODO: move to actionservice?
    public async calculateMarketplaceMessageSize(listingItemTemplate: resources.ListingItemTemplate): Promise<MessageSize> {

        // convert the template to message
        const action = await this.listingItemAddMessageFactory.get({
            listingItem: listingItemTemplate
        } as ListingItemAddMessageCreateParams);

        const marketplaceMessage = {
            version: ompVersion(),
            action
        } as MarketplaceMessage;

        // this.log.debug('marketplacemessage: ', JSON.stringify(marketPlaceMessage, null, 2));

        // let imageDataSize = 0;
        // if (action.item.information.images) {
        //     for (const image of action.item.information.images) {
        //         imageDataSize = imageDataSize + image.data[0].data.length;
        //         this.log.debug('imageDataSize: ', image.data[0].data.length);
        //     }
        // }
        const messageDataSize = JSON.stringify(marketplaceMessage).length; // - imageDataSize;
        const spaceLeft = ListingItemTemplateService.MAX_SMSG_SIZE - messageDataSize; // - imageDataSize;
        const fits = spaceLeft > 0;

        return {
            messageData: messageDataSize,
            // imageData: imageDataSize,
            spaceLeft,
            fits
        } as MessageSize;
    }

    /**
     * sets the featured image for the ListingItemTemlate
     *
     * @param listingItemTemplate
     * @param imageId
     *
     */
    public async setFeaturedImage(listingItemTemplate: resources.ListingItemTemplate, imageId: number): Promise<ItemImage> {
        if (!_.isEmpty(listingItemTemplate.ItemInformation.ItemImages)) {

            for (const itemImage of listingItemTemplate.ItemInformation.ItemImages) {
                const featured = itemImage.id === imageId;
                await this.itemImageService.updateFeatured(itemImage.id, featured);
            }
            return await this.itemImageService.findOne(imageId);
        } else {
            this.log.error('ListingItemTemplate has no ItemImages.');
            throw new MessageException('ListingItemTemplate has no Images.');
        }
    }

    private async checkExistingObjectFieldValueExistsInArray<T>(objectArray: T[], fieldName: string, value: string | number): Promise<T | undefined> {
        return _.find<T>(objectArray, (object) => {
            return (object[fieldName] === value);
        });
    }

    // find highest order number from listingItemObjects
    private async findHighestOrderNumber(listingItemObjects: resources.ListingItemObject[]): Promise<number> {
        const highestOrder = await _.maxBy(listingItemObjects, (itemObject) => {
            return itemObject['order'];
        });
        return highestOrder ? highestOrder['order'] : 0;
    }

    /**
     *  Reads ORIGINAL version of an image from file (throws exception if file cannot be read), resizes and reduces quality,
     *  returning the modified image value.
     *
     * @param {string} imageHash
     * @param {boolean} qualityFactor
     * @returns {Promise<string>}
     */
    private async getResizedImage(imageHash: string, qualityFactor: number): Promise<string> {
        if (qualityFactor <= 0) {
            return '';
        }
        const originalItemImage = await this.itemImageDataService.loadImageFile(imageHash, ImageVersions.ORIGINAL.propName);

        let compressedImage = await ImageProcessing.resizeImageToFit(
            originalItemImage,
            ListingItemTemplateService.IMG_BOUNDING_WIDTH,
            ListingItemTemplateService.IMG_BOUNDING_HEIGHT
        );
        compressedImage = await ImageProcessing.downgradeQuality(
            compressedImage,
            qualityFactor
        );
        return compressedImage;
    }

    /**
     *
     * @param listingItemTemplate
     * @param setOriginalAsParent
     * @param newMarket
     */
    private async getCloneCreateRequest(listingItemTemplate: resources.ListingItemTemplate, setOriginalAsParent: boolean = false, newMarket?: string):
        Promise<ListingItemTemplateCreateRequest> {

        let shippingDestinations: ShippingDestinationCreateRequest[] = [];

        if (!_.isEmpty(listingItemTemplate.ItemInformation.ShippingDestinations)) {
            shippingDestinations = _.map(listingItemTemplate.ItemInformation.ShippingDestinations, (destination) => {
                return _.assign({} as ShippingDestinationCreateRequest, {
                    country: destination.country,
                    shippingAvailability: destination.shippingAvailability
                });
            });
        }

        let itemImages: ItemImageCreateRequest[] = [];
        if (!_.isEmpty(listingItemTemplate.ItemInformation.ItemImages)) {

            itemImages = await Promise.all(_.map(listingItemTemplate.ItemInformation.ItemImages, async (image) => {

                // for each image, get the data from ORIGINAL and create a new ItemImageCreateRequest based on that data
                const itemImageDataOriginal: resources.ItemImageData = _.find(image.ItemImageDatas, (imageData) => {
                    return imageData.imageVersion === ImageVersions.ORIGINAL.propName;
                })!;

                // load the image data
                itemImageDataOriginal.data = await this.itemImageDataService.loadImageFile(image.hash, itemImageDataOriginal.imageVersion);

                return _.assign({} as ItemImageCreateRequest, {
                    data: [{
                        dataId: itemImageDataOriginal.dataId,
                        protocol: itemImageDataOriginal.protocol,
                        encoding: itemImageDataOriginal.encoding,
                        data: itemImageDataOriginal.data,
                        imageVersion: ImageVersions.ORIGINAL.propName,
                        originalMime: itemImageDataOriginal.originalMime,
                        originalName: itemImageDataOriginal.originalName
                    }] as ItemImageDataCreateRequest[],
                    featured: itemImageDataOriginal.featured
                } as ItemImageCreateRequest);
            }));
        }

        let messagingInformation: MessagingInformationCreateRequest[] = [];
        if (!_.isEmpty(listingItemTemplate.MessagingInformation)) {
            messagingInformation = _.map(listingItemTemplate.MessagingInformation, (msgInfo) => {
                return _.assign({} as MessagingInformationCreateRequest, {
                    protocol: msgInfo.protocol,
                    publicKey: msgInfo.publicKey
                });
            });
        }

        let listingItemObjects: ListingItemObjectCreateRequest[] = [];
        if (!_.isEmpty(listingItemTemplate.MessagingInformation)) {
            listingItemObjects = _.map(listingItemTemplate.ListingItemObjects, (liObject) => {
                // this.log.debug('liObject.ListingItemObjectDatas: ', JSON.stringify(liObject.ListingItemObjectDatas, null, 2));
                const listingItemObjectDatas: ListingItemObjectDataCreateRequest[] = _.map(liObject.ListingItemObjectDatas, (liObjectData) => {
                    this.log.debug('liObjectData: ', JSON.stringify(liObjectData, null, 2));
                    return _.assign({} as ListingItemObjectCreateRequest, {
                        key: liObjectData.key,
                        value: liObjectData.value
                    } as ListingItemObjectDataCreateRequest);
                });
                // this.log.debug('listingItemObjectDatas: ', JSON.stringify(listingItemObjectDatas, null, 2));

                return _.assign({} as ListingItemObjectCreateRequest, {
                    type: liObject.type,
                    description: liObject.description,
                    order: liObject.order,
                    listingItemObjectDatas
                } as ListingItemObjectCreateRequest);
            });
            // this.log.debug('listingItemObjects: ', JSON.stringify(listingItemObjects, null, 2));
        }

        return {
            parent_listing_item_template_id: setOriginalAsParent
                ? (_.isEmpty(listingItemTemplate.ParentListingItemTemplate) // this is going to be a new version of an existing template
                    ? listingItemTemplate.id                                    // we are cloning the base template
                    : listingItemTemplate.ParentListingItemTemplate.id)         // we are cloning some other version x, so use the basetemplate.id
                : undefined,                                                // this is supposed to be a new base template, no parent
            profile_id: listingItemTemplate.Profile.id,
            market: !setOriginalAsParent ? undefined : (newMarket ? newMarket : listingItemTemplate.market),
            // if we are not setting original as parent:
            //  - it means this is a new base template
            //  - no market && no parent
            // if we are setting original as parent:
            //  - parent should always be relation to the original base template
            //  - use the listingItemTemplate.parent_template_id if it exists, and if not then use listingItemTemplate.id
            //  - use given market if it exists, or else the one in the original
            // hash should be null, until the template is posted
            generatedAt: +Date.now(),

            itemInformation: {
                title: listingItemTemplate.ItemInformation.title,
                shortDescription: listingItemTemplate.ItemInformation.shortDescription,
                longDescription: listingItemTemplate.ItemInformation.longDescription,
                item_category_id: listingItemTemplate.ItemInformation.ItemCategory.id,
                shippingDestinations,
                itemImages,
                itemLocation: {
                    country: listingItemTemplate.ItemInformation.ItemLocation.country,
                    address: listingItemTemplate.ItemInformation.ItemLocation.address,
                    description: listingItemTemplate.ItemInformation.ItemLocation.description,
                    locationMarker: {
                        lat: listingItemTemplate.ItemInformation.ItemLocation.LocationMarker.lat,
                        lng: listingItemTemplate.ItemInformation.ItemLocation.LocationMarker.lng,
                        title: listingItemTemplate.ItemInformation.ItemLocation.LocationMarker.title,
                        description: listingItemTemplate.ItemInformation.ItemLocation.LocationMarker.description
                    } as LocationMarkerCreateRequest
                } as ItemLocationCreateRequest
            } as ItemInformationCreateRequest,
            paymentInformation: {
                type: listingItemTemplate.PaymentInformation.type,
                itemPrice: {
                    currency: listingItemTemplate.PaymentInformation.ItemPrice.currency,
                    basePrice: listingItemTemplate.PaymentInformation.ItemPrice.basePrice,
                    shippingPrice: {
                        domestic: listingItemTemplate.PaymentInformation.ItemPrice.ShippingPrice.domestic,
                        international: listingItemTemplate.PaymentInformation.ItemPrice.ShippingPrice.international
                    } as ShippingPriceCreateRequest
                } as ItemPriceCreateRequest,
                escrow: {
                    type: listingItemTemplate.PaymentInformation.Escrow.type,
                    secondsToLock: listingItemTemplate.PaymentInformation.Escrow.secondsToLock,
                    ratio: {
                        buyer: listingItemTemplate.PaymentInformation.Escrow.Ratio.buyer,
                        seller: listingItemTemplate.PaymentInformation.Escrow.Ratio.seller
                    } as EscrowRatioCreateRequest
                } as EscrowCreateRequest
            } as PaymentInformationCreateRequest,
            messagingInformation,
            listingItemObjects
        } as ListingItemTemplateCreateRequest;
    }

}
