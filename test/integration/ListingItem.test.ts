// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import * as _ from 'lodash';
import * as resources from 'resources';
import * as Faker from 'faker';
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
import { hash } from 'omp-lib/dist/hasher/hash';
import { ImageVersions } from '../../src/core/helpers/ImageVersionEnumType';
import { ItemImageDataService } from '../../src/api/services/model/ItemImageDataService';
import { ItemCategoryCreateRequest } from '../../src/api/requests/model/ItemCategoryCreateRequest';
import { ShippingCountries } from '../../src/core/helpers/ShippingCountries';
import { LocationMarkerCreateRequest } from '../../src/api/requests/model/LocationMarkerCreateRequest';
import { ItemLocationCreateRequest } from '../../src/api/requests/model/ItemLocationCreateRequest';
import { ShippingAvailability } from '../../src/api/enums/ShippingAvailability';
import { ShippingDestinationCreateRequest } from '../../src/api/requests/model/ShippingDestinationCreateRequest';
import { ItemImageCreateRequest } from '../../src/api/requests/model/ItemImageCreateRequest';
import { EscrowType, SaleType } from 'omp-lib/dist/interfaces/omp-enums';
import { EscrowRatioCreateRequest } from '../../src/api/requests/model/EscrowRatioCreateRequest';
import { EscrowCreateRequest } from '../../src/api/requests/model/EscrowCreateRequest';
import { CryptoAddressType, Cryptocurrency } from 'omp-lib/dist/interfaces/crypto';
import { toSatoshis } from 'omp-lib/dist/util';
import { ShippingPriceCreateRequest } from '../../src/api/requests/model/ShippingPriceCreateRequest';
import { CryptocurrencyAddressCreateRequest } from '../../src/api/requests/model/CryptocurrencyAddressCreateRequest';
import { ItemPriceCreateRequest } from '../../src/api/requests/model/ItemPriceCreateRequest';
import { ItemImageDataCreateRequest } from '../../src/api/requests/model/ItemImageDataCreateRequest';
import { ProtocolDSN } from 'omp-lib/dist/interfaces/dsn';

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
        log.debug('itemInformation passed');

        if (!_.isEmpty(createRequest.paymentInformation)) {
            expectPaymentInformationFromCreateRequest(result.PaymentInformation, createRequest.paymentInformation);
        } else {
            expect(result.PaymentInformation).toEqual({});
        }
        log.debug('paymentInformation passed');

        if (!_.isEmpty(createRequest.messagingInformation)) {
            expectMessagingInformationFromCreateRequest(result.MessagingInformation, createRequest.messagingInformation);
        } else {
            expect(result.MessagingInformation).toEqual([]);
        }
        log.debug('messagingInformation passed');

        if (!_.isEmpty(createRequest.listingItemObjects)) {
            expectListingItemObjectsFromCreateRequest(result.ListingItemObjects, createRequest.listingItemObjects);
        } else {
            expect(result.ListingItemObjects).toEqual([]);
        }
        log.debug('listingItemObjects passed');

    };

    const expectItemInformationFromCreateRequest = (result: resources.ItemInformation, createRequest: ItemInformationCreateRequest) => {

        expect(result.title).toBe(createRequest.title);
        expect(result.shortDescription).toBe(createRequest.shortDescription);
        expect(result.longDescription).toBe(createRequest.longDescription);
        expect(result.ItemCategory.key).toBe(createRequest.itemCategory.key);
        expect(result.ItemCategory.market).toBe(createRequest.itemCategory.market);
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

    const generateListingItemCreateRequest = async (): Promise<ListingItemCreateRequest> => {
        const now = Date.now();
        const randomImageData1 = await testDataService.generateRandomImage(20, 20);

        const createRequest = {
            hash: Faker.random.uuid(),
            msgid: Faker.random.uuid(),
            seller: market.Identity.address,
            market: market.receiveAddress,
            // listing_item_template_id: 0,
            expiryTime: 4,
            postedAt: now,
            expiredAt: now,
            receivedAt: now,
            generatedAt: now,
            itemInformation: {
                title: Faker.random.words(4),
                shortDescription: Faker.random.words(10),
                longDescription: Faker.random.words(30),
                itemCategory: {
                    key: 'cat_particl_free_swag',
                    market: market.receiveAddress
                    // name: 'Test Data',
                    // description: 'Test Data Category',
                    // market: market.receiveAddress
                } as ItemCategoryCreateRequest,
                itemLocation: {
                    country: Faker.random.arrayElement(Object.getOwnPropertyNames(ShippingCountries.countryCodeList)),
                    address: Faker.address.streetAddress(),
                    description: Faker.lorem.paragraph(),
                    locationMarker: {
                        lat: _.random(-50, 50),
                        lng: _.random(-50, 50),
                        title: Faker.lorem.word(),
                        description: Faker.lorem.sentence()
                    } as LocationMarkerCreateRequest
                } as ItemLocationCreateRequest,
                shippingDestinations: [{
                    country: Faker.random.arrayElement(Object.getOwnPropertyNames(ShippingCountries.countryCodeList)),
                    shippingAvailability: ShippingAvailability.SHIPS
                }] as ShippingDestinationCreateRequest[],
                itemImages: [{
                    data: [{
                        // when we receive ListingItemAddMessage -> ProtocolDSN.SMSG
                        // when we receive ListingItemImageAddMessage -> ProtocolDSN.LOCAL
                        protocol: ProtocolDSN.LOCAL,
                        encoding: 'BASE64',
                        dataId: 'https://particl.io/images/' + Faker.random.uuid(),
                        imageVersion: ImageVersions.ORIGINAL.propName,
                        data: randomImageData1
                    }] as ItemImageDataCreateRequest[],
                    featured: false,
                    hash: 'TEST-IMAGEHASH1'
                }] as ItemImageCreateRequest[]
            } as ItemInformationCreateRequest,
            paymentInformation: {
                type: SaleType.SALE,
                escrow: {
                    type: EscrowType.MAD_CT,
                    secondsToLock: 4,
                    ratio: {
                        buyer: 100,
                        seller: 100
                    } as EscrowRatioCreateRequest
                } as EscrowCreateRequest,
                itemPrice: {
                    currency: Cryptocurrency.PART, // Faker.random.arrayElement(Object.getOwnPropertyNames(Currency)),
                    basePrice: toSatoshis(+_.random(0.1, 1.00).toFixed(8)),
                    shippingPrice: {
                        domestic: toSatoshis(+_.random(0.01, 0.10).toFixed(8)),
                        international: toSatoshis(+_.random(0.10, 0.20).toFixed(8))
                    } as ShippingPriceCreateRequest,
                    cryptocurrencyAddress: {
                        type: CryptoAddressType.STEALTH,
                        address: Faker.finance.bitcoinAddress()
                    } as CryptocurrencyAddressCreateRequest
                } as ItemPriceCreateRequest
            } as PaymentInformationCreateRequest,
            messagingInformation: [] as MessagingInformationCreateRequest[],
            listingItemObjects: [] as ListingItemObjectCreateRequest[]
        } as ListingItemCreateRequest;

        createRequest.hash = hash(createRequest);     // TODO: FIX
        return createRequest;
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

        const testDataToSave: ListingItemCreateRequest = await generateListingItemCreateRequest();
        log.debug('testDataToSave: ', JSON.stringify(testDataToSave, null, 2));
        createdListingItem1 = await listingItemService.create(testDataToSave).then(value => value.toJSON());
        log.debug('createdListingItem1: ', JSON.stringify(createdListingItem1, null, 2));

        expectListingItemFromCreateRequest(createdListingItem1, testDataToSave);
    }, 600000); // timeout to 600s


    test('Should findAll ListingItems with the previously created one', async () => {
        const result: resources.ListingItem[] = await listingItemService.findAll().then(value => value.toJSON());
        expect(result).toHaveLength(1);
    });


    test('Should findOne ListingItem using id', async () => {
        const result: resources.ListingItem = await listingItemService.findOne(createdListingItem1.id).then(value => value.toJSON());
        expect(result.hash).toBe(createdListingItem1.hash);
    });


    test('Should findOne ListingItem using hash', async () => {
        const result: resources.ListingItem = await listingItemService.findOneByHashAndMarketReceiveAddress(createdListingItem1.hash,
            createdListingItem1.market).then(value => value.toJSON());
        expect(result.hash).toBe(createdListingItem1.hash);
    });

/*
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
*/

/*
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
*/

    test('Should delete the previously created ListingItem', async () => {
        expect.assertions(12);
        await listingItemService.destroy(createdListingItem1.id);
        await expectListingItemWasDeleted(createdListingItem1);
    });

/*
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
*/

/*
    // TODO: fix this
    test('Should find expired ListingItema', async () => {
        await listingItemService.findAllExpired();
        await listingItemService.findOne(createdListingItem1.id).catch(e =>
            expect(e).toEqual(new NotFoundException(createdListingItem1.id))
        );
    });
*/

/*
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
*/
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
