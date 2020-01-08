// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import * as _ from 'lodash';
import * as resources from 'resources';
import { app } from '../../src/app';
import { Logger as LoggerType } from '../../src/core/Logger';
import { Types, Core, Targets } from '../../src/constants';
import { TestUtil } from './lib/TestUtil';
import { ValidationException } from '../../src/api/exceptions/ValidationException';
import { NotFoundException } from '../../src/api/exceptions/NotFoundException';
import { ListingItemCreateRequest } from '../../src/api/requests/model/ListingItemCreateRequest';
import { ItemInformationCreateRequest } from '../../src/api/requests/model/ItemInformationCreateRequest';
import { PaymentInformationCreateRequest } from '../../src/api/requests/model/PaymentInformationCreateRequest';
import { MessagingInformationCreateRequest } from '../../src/api/requests/model/MessagingInformationCreateRequest';
import { ListingItemObjectCreateRequest } from '../../src/api/requests/model/ListingItemObjectCreateRequest';
import { TestDataService } from '../../src/api/services/TestDataService';
import { ListingItemService } from '../../src/api/services/model/ListingItemService';
import { ListingItemTemplateService } from '../../src/api/services/model/ListingItemTemplateService';
import { ProfileService } from '../../src/api/services/model/ProfileService';
import { MarketService } from '../../src/api/services/model/MarketService';
import { ItemInformationService } from '../../src/api/services/model/ItemInformationService';
import { ItemLocationService } from '../../src/api/services/model/ItemLocationService';
import { LocationMarkerService } from '../../src/api/services/model/LocationMarkerService';
import { ShippingDestinationService } from '../../src/api/services/model/ShippingDestinationService';
import { ItemImageService } from '../../src/api/services/model/ItemImageService';
import { PaymentInformationService } from '../../src/api/services/model/PaymentInformationService';
import { EscrowService } from '../../src/api/services/model/EscrowService';
import { EscrowRatioService } from '../../src/api/services/model/EscrowRatioService';
import { ItemPriceService } from '../../src/api/services/model/ItemPriceService';
import { ShippingPriceService } from '../../src/api/services/model/ShippingPriceService';
import { CryptocurrencyAddressService } from '../../src/api/services/model/CryptocurrencyAddressService';
import { MessagingInformationService } from '../../src/api/services/model/MessagingInformationService';
import { ListingItemObjectService } from '../../src/api/services/model/ListingItemObjectService';
import { ListingItemObjectDataService } from '../../src/api/services/model/ListingItemObjectDataService';
import * as listingItemCreateRequestBasic1 from '../testdata/createrequest/listingItemCreateRequestBasic1.json';
import * as listingItemCreateRequestBasic2 from '../testdata/createrequest/listingItemCreateRequestBasic2.json';
import * as listingItemCreateRequestExpired from '../testdata/createrequest/listingItemCreateRequestExpired.json';
import * as listingItemUpdateRequestBasic1 from '../testdata/updaterequest/listingItemUpdateRequestBasic1.json';
import { hash } from 'omp-lib/dist/hasher/hash';
import { ImageVersions } from '../../src/core/helpers/ImageVersionEnumType';
import { ItemImageDataService } from '../../src/api/services/model/ItemImageDataService';

describe('ListingItem', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);
    const testUtil = new TestUtil();

    let testDataService: TestDataService;
    let listingItemService: ListingItemService;
    let listingItemTemplateService: ListingItemTemplateService;
    let profileService: ProfileService;
    let marketService: MarketService;
    let itemInformationService: ItemInformationService;
    let itemLocationService: ItemLocationService;
    let locationMarkerService: LocationMarkerService;
    let shippingDestinationService: ShippingDestinationService;
    let itemImageService: ItemImageService;
    let itemImageDataService: ItemImageDataService;
    let paymentInformationService: PaymentInformationService;
    let escrowService: EscrowService;
    let escrowRatioService: EscrowRatioService;
    let itemPriceService: ItemPriceService;
    let shippingPriceService: ShippingPriceService;
    let cryptocurrencyAddressService: CryptocurrencyAddressService;
    let messagingInformationService: MessagingInformationService;
    let listingItemObjectService: ListingItemObjectService;
    let listingItemObjectDataService: ListingItemObjectDataService;

    let createdListingItem1: resources.ListingItem;
    let createdListingItem2: resources.ListingItem;
    let createdListingItem3: resources.ListingItem;
    let updatedListingItem1: resources.ListingItem;

    let profile: resources.Profile;
    let market: resources.Market;

    beforeAll(async () => {
        await testUtil.bootstrapAppContainer(app);  // bootstrap the app

        testDataService = app.IoC.getNamed<TestDataService>(Types.Service, Targets.Service.TestDataService);
        listingItemService = app.IoC.getNamed<ListingItemService>(Types.Service, Targets.Service.model.ListingItemService);
        listingItemTemplateService = app.IoC.getNamed<ListingItemTemplateService>(Types.Service, Targets.Service.model.ListingItemTemplateService);
        profileService = app.IoC.getNamed<ProfileService>(Types.Service, Targets.Service.model.ProfileService);
        marketService = app.IoC.getNamed<MarketService>(Types.Service, Targets.Service.model.MarketService);
        itemInformationService = app.IoC.getNamed<ItemInformationService>(Types.Service, Targets.Service.model.ItemInformationService);
        itemLocationService = app.IoC.getNamed<ItemLocationService>(Types.Service, Targets.Service.model.ItemLocationService);
        locationMarkerService = app.IoC.getNamed<LocationMarkerService>(Types.Service, Targets.Service.model.LocationMarkerService);
        shippingDestinationService = app.IoC.getNamed<ShippingDestinationService>(Types.Service, Targets.Service.model.ShippingDestinationService);
        itemImageService = app.IoC.getNamed<ItemImageService>(Types.Service, Targets.Service.model.ItemImageService);
        itemImageDataService = app.IoC.getNamed<ItemImageDataService>(Types.Service, Targets.Service.model.ItemImageDataService);
        paymentInformationService = app.IoC.getNamed<PaymentInformationService>(Types.Service, Targets.Service.model.PaymentInformationService);
        escrowService = app.IoC.getNamed<EscrowService>(Types.Service, Targets.Service.model.EscrowService);
        escrowRatioService = app.IoC.getNamed<EscrowRatioService>(Types.Service, Targets.Service.model.EscrowRatioService);
        itemPriceService = app.IoC.getNamed<ItemPriceService>(Types.Service, Targets.Service.model.ItemPriceService);
        shippingPriceService = app.IoC.getNamed<ShippingPriceService>(Types.Service, Targets.Service.model.ShippingPriceService);
        cryptocurrencyAddressService = app.IoC.getNamed<CryptocurrencyAddressService>(Types.Service, Targets.Service.model.CryptocurrencyAddressService);
        messagingInformationService = app.IoC.getNamed<MessagingInformationService>(Types.Service, Targets.Service.model.MessagingInformationService);
        listingItemObjectService = app.IoC.getNamed<ListingItemObjectService>(Types.Service, Targets.Service.model.ListingItemObjectService);
        listingItemObjectDataService = app.IoC.getNamed<ListingItemObjectDataService>(Types.Service, Targets.Service.model.ListingItemObjectDataService);

        // clean up the db, first removes all data and then seeds the db with default data
        await testDataService.clean();

        // get default profile + market
        profile = await profileService.getDefault().then(value => value.toJSON());
        market = await marketService.getDefaultForProfile(profile.id).then(value => value.toJSON());
    });

    const expectListingItemFromCreateRequest = (result: resources.ListingItem, createRequest: ListingItemCreateRequest) => {

        expect(result.id).not.toBeNull();
        expect(result.hash).not.toBeNull();
        expect(result.seller).toBe(createRequest.seller);

        if (!_.isEmpty(createRequest.itemInformation)) {
            expectItemInformationFromCreateRequest(result.ItemInformation, createRequest.itemInformation);
        } else {
            expect(result.ItemInformation).toEqual({});
        }

        if (!_.isEmpty(createRequest.paymentInformation)) {
            expectPaymentInformationFromCreateRequest(result.PaymentInformation, createRequest.paymentInformation);
        } else {
            expect(result.PaymentInformation).toEqual({});
        }

        if (!_.isEmpty(createRequest.messagingInformation)) {
            expectMessagingInformationFromCreateRequest(result.MessagingInformation, createRequest.messagingInformation);
        } else {
            expect(result.MessagingInformation).toEqual([]);
        }

        if (!_.isEmpty(createRequest.listingItemObjects)) {
            expectListingItemObjectsFromCreateRequest(result.ListingItemObjects, createRequest.listingItemObjects);
        } else {
            expect(result.ListingItemObjects).toEqual([]);
        }

    };

    const expectItemInformationFromCreateRequest = (result: resources.ItemInformation, createRequest: ItemInformationCreateRequest) => {
        expect(result.title).toBe(createRequest.title);
        expect(result.shortDescription).toBe(createRequest.shortDescription);
        expect(result.longDescription).toBe(createRequest.longDescription);
        expect(result.ItemCategory.name).toBe(createRequest.itemCategory.name);
        expect(result.ItemCategory.description).toBe(createRequest.itemCategory.description);
        expect(result.ItemLocation.country).toBe(createRequest.itemLocation.country);
        expect(result.ItemLocation.address).toBe(createRequest.itemLocation.address);
        expect(result.ItemLocation.LocationMarker.title).toBe(createRequest.itemLocation.locationMarker.title);
        expect(result.ItemLocation.LocationMarker.description).toBe(createRequest.itemLocation.locationMarker.description);
        expect(result.ItemLocation.LocationMarker.lat).toBe(createRequest.itemLocation.locationMarker.lat);
        expect(result.ItemLocation.LocationMarker.lng).toBe(createRequest.itemLocation.locationMarker.lng);
        expect(result.ShippingDestinations).toHaveLength(createRequest.shippingDestinations.length);
        expect(result.ItemImages).toHaveLength(createRequest.itemImages.length);
        expect(result.ItemImages[0].ItemImageDatas).toHaveLength(4); // 4 sizes
    };

    const expectPaymentInformationFromCreateRequest = (result: resources.PaymentInformation, createRequest: PaymentInformationCreateRequest) => {
        expect(result.type).toBe(createRequest.type);
        expect(result.Escrow.type).toBe(createRequest.escrow.type);
        expect(result.Escrow.Ratio.buyer).toBe(createRequest.escrow.ratio.buyer);
        expect(result.Escrow.Ratio.seller).toBe(createRequest.escrow.ratio.seller);
        expect(result.ItemPrice.currency).toBe(createRequest.itemPrice.currency);
        expect(result.ItemPrice.basePrice).toBe(createRequest.itemPrice.basePrice);
        expect(result.ItemPrice.ShippingPrice.domestic).toBe(createRequest.itemPrice.shippingPrice.domestic);
        expect(result.ItemPrice.ShippingPrice.international).toBe(createRequest.itemPrice.shippingPrice.international);
        expect(result.ItemPrice.CryptocurrencyAddress.type).toBe(createRequest.itemPrice.cryptocurrencyAddress.type);
        expect(result.ItemPrice.CryptocurrencyAddress.address).toBe(createRequest.itemPrice.cryptocurrencyAddress.address);
    };

    const expectMessagingInformationFromCreateRequest = (results: resources.MessagingInformation, createRequest: MessagingInformationCreateRequest[]) => {
        expect(results[0].protocol).toBe(createRequest[0].protocol);
        expect(results[0].publicKey).toBe(createRequest[0].publicKey);
    };

    const expectListingItemObjectsFromCreateRequest = (results: resources.ListingItemObjects, createRequest: ListingItemObjectCreateRequest[]) => {
        expect(results[0].type).toBe(createRequest[0].type);
        expect(results[0].description).toBe(createRequest[0].description);
        expect(results[0].order).toBe(createRequest[0].order);
        expect(results[0].objectId).toBeDefined();
        expect(results[0].forceInput).toBeDefined();

        const objectDataResults = results[0].ListingItemObjectDatas;
        expect(objectDataResults[0].key).toBe(createRequest[0].listingItemObjectDatas[0].key);
        expect(objectDataResults[0].value).toBe(createRequest[0].listingItemObjectDatas[0].value);
    };

    const expectListingItemWasDeleted = async (item: resources.ListingItem) => {
        await listingItemService.findOne(item.id).catch(e =>
            expect(e).toEqual(new NotFoundException(item.id))
        );

        // ItemInformation
        if (!_.isEmpty(item.ItemInformation)) {
            await itemInformationService.findOne(item.ItemInformation.id, false).catch(e =>
                expect(e).toEqual(new NotFoundException(item.ItemInformation.id))
            );

            // ItemLocation
            if (!_.isEmpty(item.ItemInformation.ItemLocation)) {
                const itemLocationId = item.ItemInformation.ItemLocation.id;
                await itemLocationService.findOne(itemLocationId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(itemLocationId))
                );

                // LocationMarker
                if (!_.isEmpty(item.ItemInformation.ItemLocation.LocationMarker)) {
                    const locationMarkerId = item.ItemInformation.ItemLocation.LocationMarker.id;
                    await locationMarkerService.findOne(locationMarkerId, false).catch(e =>
                        expect(e).toEqual(new NotFoundException(locationMarkerId))
                    );
                }
            }

            // ShippingDestination
            if (!_.isEmpty(item.ItemInformation.ShippingDestinations)) {
                const shipDestinationId = item.ItemInformation.ShippingDestinations[0].id;
                await shippingDestinationService.findOne(shipDestinationId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(shipDestinationId))
                );
            }

            // ItemImage
            if (!_.isEmpty(item.ItemInformation.ItemImages)) {
                const itemImageId = item.ItemInformation.ItemImages[0].id;
                await itemImageService.findOne(itemImageId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(itemImageId))
                );

                if (!_.isEmpty(item.ItemInformation.ItemImages[0].ItemImageDatas)) {
                    const itemImage: resources.ItemImage = item.ItemInformation.ItemImages[0];
                    const data = await itemImageDataService.loadImageFile(itemImage.hash, ImageVersions.ORIGINAL.propName)
                        .catch(reason => {
                            //
                        });
                    expect(data).toBeUndefined();
                }
            }
        }

        // PaymentInformation
        if (!_.isEmpty(item.PaymentInformation)) {
            await paymentInformationService.findOne(item.PaymentInformation.id, false).catch(e =>
                expect(e).toEqual(new NotFoundException(item.PaymentInformation.id))
            );

            // Escrow
            if (!_.isEmpty(item.PaymentInformation.Escrow)) {
                const escrowId = item.PaymentInformation.Escrow.id;
                await escrowService.findOne(escrowId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(escrowId))
                );

                // EscrowRatio
                if (!_.isEmpty(item.PaymentInformation.Escrow)) {
                    const escrowRatioId = item.PaymentInformation.Escrow.Ratio.id;
                    await escrowRatioService.findOne(escrowRatioId, false).catch(e =>
                        expect(e).toEqual(new NotFoundException(escrowRatioId))
                    );
                }
            }

            // ItemPrice
            if (!_.isEmpty(item.PaymentInformation.ItemPrice)) {
                const itemPriceId = item.PaymentInformation.ItemPrice.id;
                await itemPriceService.findOne(itemPriceId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(itemPriceId))
                );

                // ShippingPrice
                if (!_.isEmpty(item.PaymentInformation.ItemPrice.ShippingPrice)) {
                    const shippingPriceId = item.PaymentInformation.ItemPrice.ShippingPrice.id;
                    await shippingPriceService.findOne(shippingPriceId, false).catch(e =>
                        expect(e).toEqual(new NotFoundException(shippingPriceId))
                    );
                }

                // CryptocurrencyAddress
                if (!_.isEmpty(item.PaymentInformation.ItemPrice.CryptocurrencyAddress)) {
                    const cryptoCurrencyId = item.PaymentInformation.ItemPrice.CryptocurrencyAddress.id;
                    await cryptocurrencyAddressService.findOne(cryptoCurrencyId, false).catch(e =>
                        expect(e).toEqual(new NotFoundException(cryptoCurrencyId))
                    );
                }
            }
        }

        // MessagingInformation
        if (!_.isEmpty(item.MessagingInformation)) {
            for (const messagingInformation of item.MessagingInformation) {
                const messagingInformationId = messagingInformation.id;
                await messagingInformationService.findOne(messagingInformationId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(messagingInformationId))
                );
            }
        }

        // ListingItemObjects
        if (!_.isEmpty(item.ListingItemObjects)) {
            for (const listingItemObject of item.ListingItemObjects) {
                const listintItemObjectId = listingItemObject.id;
                // ListingItemObjectDatas
                const listintItemObjectDatas = listingItemObject.ListingItemObjectDatas;
                if (!_.isEmpty(listintItemObjectDatas)) {
                    for (const listintItemObjectData of listintItemObjectDatas) {
                        await listingItemObjectDataService.findOne(listintItemObjectData.id, false).catch(e =>
                            expect(e).toEqual(new NotFoundException(listintItemObjectData.id))
                        );
                    }
                }
                await listingItemObjectService.findOne(listintItemObjectId, false).catch(e =>
                    expect(e).toEqual(new NotFoundException(listintItemObjectId))
                );
            }
        }
    };

    // TODO: missing searchBy tests
    // TODO: test with images only on the template tests

    // -------------------------------
    // TESTS
    // -------------------------------
    test('Should throw ValidationException because we want to create a empty listing item', async () => {
        expect.assertions(1);
        await listingItemService.create({} as ListingItemCreateRequest).catch(e =>
            expect(e).toEqual(new ValidationException('Request body is not valid', []))
        );
    });

    test('Should create a new ListingItem', async () => {
        const testDataToSave = JSON.parse(JSON.stringify(listingItemCreateRequestBasic1));
        testDataToSave.market = market.receiveAddress;
        testDataToSave.seller = profile.address;
        testDataToSave.hash = hash(testDataToSave);     // TODO: FIX

        // generate random images so that they can be deleted
        testDataToSave.itemInformation.itemImages[0].data[0].data = await testDataService.generateRandomImage(20, 20);
        testDataToSave.itemInformation.itemImages[1].data[0].data = await testDataService.generateRandomImage(20, 20);

        createdListingItem1 = await listingItemService.create(testDataToSave).then(value => value.toJSON());

        expectListingItemFromCreateRequest(createdListingItem1, testDataToSave);
    }, 600000); // timeout to 600s


    test('Should findAll ListingItems consisting of the previously created one', async () => {
        const listingItems: resources.ListingItem[] = await listingItemService.findAll().then(value => value.toJSON());
        const result: resources.ListingItem = listingItems[0];

        expect(listingItems).toHaveLength(1);
    });


    test('Should findOne ListingItem using id', async () => {
        const result: resources.ListingItem = await listingItemService.findOne(createdListingItem1.id).then(value => value.toJSON());
        expect(result.hash).toBe(createdListingItem1.hash);
    });


    test('Should findOne ListingItem using hash', async () => {
        const result: resources.ListingItem = await listingItemService.findOneByHash(createdListingItem1.hash).then(value => value.toJSON());
        expect(result.hash).toBe(createdListingItem1.hash);
    });


    test('Should create a new ListingItem without ItemInformation, PaymentInformation, MessagingInformation and ListingItemObjects', async () => {
        const testDataToSave = JSON.parse(JSON.stringify(listingItemCreateRequestBasic2));

        // remove the stuff that we dont need in this test
        delete testDataToSave.itemInformation;
        delete testDataToSave.paymentInformation;
        delete testDataToSave.messagingInformation;
        delete testDataToSave.listingItemObjects;

        testDataToSave.market = market.receiveAddress;
        testDataToSave.seller = profile.address;
        testDataToSave.hash = hash(testDataToSave);     // TODO: FIX

        createdListingItem2 = await listingItemService.create(testDataToSave).then(value => value.toJSON());

        expectListingItemFromCreateRequest(createdListingItem2, testDataToSave);
    }, 600000); // timeout to 600s


    test('Should update previously created ListingItem', async () => {
        const testDataToSave = JSON.parse(JSON.stringify(listingItemUpdateRequestBasic1));

        testDataToSave.market = market.receiveAddress;
        testDataToSave.seller = profile.address;

        // generate random images so that they can be deleted
        testDataToSave.itemInformation.itemImages[0].data[0].data = await testDataService.generateRandomImage(20, 20);
        testDataToSave.itemInformation.itemImages[1].data[0].data = await testDataService.generateRandomImage(20, 20);

        updatedListingItem1 = await listingItemService.update(createdListingItem2.id, testDataToSave).then(value => value.toJSON());

        expectListingItemFromCreateRequest(updatedListingItem1, testDataToSave);
    }, 600000); // timeout to 600s


    test('Should delete the previously updated ListingItem', async () => {
        expect.assertions(22);
        await listingItemService.destroy(updatedListingItem1.id);
        await expectListingItemWasDeleted(updatedListingItem1);
    });

    test('Should create a new ListingItem without PaymentInformation, MessagingInformation and ListingItemObjects', async () => {
        const testDataToSave = JSON.parse(JSON.stringify(listingItemCreateRequestBasic2));

        // remove the stuff that we dont need in this test
        delete testDataToSave.paymentInformation;
        delete testDataToSave.messagingInformation;
        delete testDataToSave.listingItemObjects;

        testDataToSave.market = market.receiveAddress;
        testDataToSave.seller = profile.address;
        testDataToSave.hash = hash(testDataToSave);     // TODO: FIX

        // generate random images so that they can be deleted
        testDataToSave.itemInformation.itemImages[0].data[0].data = await testDataService.generateRandomImage(20, 20);
        testDataToSave.itemInformation.itemImages[1].data[0].data = await testDataService.generateRandomImage(20, 20);

        createdListingItem2 = await listingItemService.create(testDataToSave).then(value => value.toJSON());

        expectListingItemFromCreateRequest(createdListingItem2, testDataToSave);
    }, 600000); // timeout to 600s


    test('Should delete the ListingItem with ItemInformation', async () => {
        expect.assertions(7);
        await listingItemService.destroy(createdListingItem2.id);
        await expectListingItemWasDeleted(createdListingItem2);
    });


    test('Should create a new ListingItem without MessagingInformation and ListingItemObjects', async () => {
        const testDataToSave = JSON.parse(JSON.stringify(listingItemCreateRequestBasic2));

        // remove the stuff that we dont need in this test
        delete testDataToSave.messagingInformation;
        delete testDataToSave.listingItemObjects;

        testDataToSave.market = market.receiveAddress;
        testDataToSave.seller = profile.address;
        testDataToSave.hash = hash(testDataToSave);     // TODO: FIX

        // generate random images so that they can be deleted
        testDataToSave.itemInformation.itemImages[0].data[0].data = await testDataService.generateRandomImage(20, 20);
        testDataToSave.itemInformation.itemImages[1].data[0].data = await testDataService.generateRandomImage(20, 20);

        createdListingItem2 = await listingItemService.create(testDataToSave).then(value => value.toJSON());

        expectListingItemFromCreateRequest(createdListingItem2, testDataToSave);
    }, 600000); // timeout to 600s


    test('Should delete the ListingItem with ItemInformation and PaymentInformation', async () => {
        expect.assertions(12);
        await listingItemService.destroy(createdListingItem2.id);
        await expectListingItemWasDeleted(createdListingItem2);
    });


    test('Should delete expired ListingItema', async () => {
        await listingItemService.deleteExpiredListingItems();
        await listingItemService.findOne(createdListingItem1.id).catch(e =>
            expect(e).toEqual(new NotFoundException(createdListingItem1.id))
        );
    });

    test('Should create a new ListingItem with 2 images and delete all data', async () => {
        const testDataToSave = JSON.parse(JSON.stringify(listingItemCreateRequestBasic2));

        testDataToSave.market = market.receiveAddress;
        testDataToSave.seller = profile.address;
        testDataToSave.hash = hash(testDataToSave);     // TODO: FIX

        // generate random images so that they can be deleted
        testDataToSave.itemInformation.itemImages[0].data[0].data = await testDataService.generateRandomImage(20, 20);
        testDataToSave.itemInformation.itemImages[1].data[0].data = await testDataService.generateRandomImage(20, 20);

        createdListingItem3 = await listingItemService.create(testDataToSave).then(value => value.toJSON());

        expectListingItemFromCreateRequest(createdListingItem3, testDataToSave);

        await listingItemService.destroy(createdListingItem3.id);
        await expectListingItemWasDeleted(createdListingItem3);

    }, 600000); // timeout to 600s

    /*
    // TODO: not important now, but should be fixed later
    test('Should update ListingItem correctly when removing data', async () => {

        const testDataToUpdate = JSON.parse(JSON.stringify(listingItemUpdateRequestBasic1));
        testDataToUpdate.market_id = market.id;
        testDataToSave.seller = profile.address;

        // remove some data
        delete testDataToUpdate.listingItemObjects;
        let listingItemModel: ListingItem = await listingItemService.update(createdListingItem1.id, testDataToUpdate);
        updatedListingItem1 = listingItemModel.toJSON();
        expectListingItemFromCreateRequest(updatedListingItem1, testDataToUpdate);

        // remove some more data
        delete testDataToUpdate.messagingInformation;
        listingItemModel = await listingItemService.update(createdListingItem1.id, testDataToUpdate);
        const updatedListingItem2 = listingItemModel.toJSON();
        expectListingItemFromCreateRequest(updatedListingItem1, testDataToUpdate);
        expect(updatedListingItem1.hash).not.toBe(updatedListingItem2.hash);

        // and even more
        delete testDataToUpdate.paymentInformation;
        listingItemModel = await listingItemService.update(createdListingItem1.id, testDataToUpdate);
        const updatedListingItem3 = listingItemModel.toJSON();
        expectListingItemFromCreateRequest(updatedListingItem1, testDataToUpdate);
        expect(updatedListingItem2.hash).not.toBe(updatedListingItem3.hash);

        // and more
        delete testDataToUpdate.itemInformation;
        listingItemModel = await listingItemService.update(createdListingItem1.id, testDataToUpdate);
        const updatedListingItem4 = listingItemModel.toJSON();
        expectListingItemFromCreateRequest(updatedListingItem1, testDataToUpdate);
        expect(updatedListingItem3.hash).not.toBe(updatedListingItem4.hash);

    });
    */
});
