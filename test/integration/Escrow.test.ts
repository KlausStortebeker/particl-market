// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import * as resources from 'resources';
import { app } from '../../src/app';
import { Logger as LoggerType } from '../../src/core/Logger';
import { Types, Core, Targets } from '../../src/constants';
import { TestUtil } from './lib/TestUtil';
import { TestDataService } from '../../src/api/services/TestDataService';
import { ProfileService } from '../../src/api/services/model/ProfileService';
import { EscrowService } from '../../src/api/services/model/EscrowService';
import { ListingItemTemplateService } from '../../src/api/services/model/ListingItemTemplateService';
import { PaymentInformationService } from '../../src/api/services/model/PaymentInformationService';
import { ValidationException } from '../../src/api/exceptions/ValidationException';
import { NotFoundException } from '../../src/api/exceptions/NotFoundException';
import { EscrowCreateRequest } from '../../src/api/requests/model/EscrowCreateRequest';
import { EscrowUpdateRequest } from '../../src/api/requests/model/EscrowUpdateRequest';
import { GenerateListingItemTemplateParams } from '../../src/api/requests/testdata/GenerateListingItemTemplateParams';
import { CreatableModel } from '../../src/api/enums/CreatableModel';
import { TestDataGenerateRequest } from '../../src/api/requests/testdata/TestDataGenerateRequest';
import { MarketService } from '../../src/api/services/model/MarketService';
import { EscrowType } from 'omp-lib/dist/interfaces/omp-enums';
import { EscrowRatioCreateRequest } from '../../src/api/requests/model/EscrowRatioCreateRequest';
import { EscrowRatioUpdateRequest } from '../../src/api/requests/model/EscrowRatioUpdateRequest';

describe('Escrow', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);
    const testUtil = new TestUtil();

    let testDataService: TestDataService;
    let marketService: MarketService;
    let escrowService: EscrowService;
    let profileService: ProfileService;
    let listingItemTemplateService: ListingItemTemplateService;
    let paymentInformationService: PaymentInformationService;

    let market: resources.Market;
    let profile: resources.Profile;

    let listingItemTemplate: resources.ListingItemTemplate;
    let escrow: resources.Escrow;

    const testData = {
        type: EscrowType.MAD,
        ratio: {
            buyer: 50,
            seller: 50
        } as EscrowRatioCreateRequest,
        secondsToLock: 2
    } as EscrowCreateRequest;

    const testDataUpdated = {
        type: EscrowType.MULTISIG,
        ratio: {
            buyer: 100,
            seller: 100
        } as EscrowRatioUpdateRequest,
        secondsToLock: 5
    } as EscrowUpdateRequest;

    beforeAll(async () => {
        await testUtil.bootstrapAppContainer(app);  // bootstrap the app

        testDataService = app.IoC.getNamed<TestDataService>(Types.Service, Targets.Service.TestDataService);
        escrowService = app.IoC.getNamed<EscrowService>(Types.Service, Targets.Service.model.EscrowService);
        marketService = app.IoC.getNamed<MarketService>(Types.Service, Targets.Service.model.MarketService);
        profileService = app.IoC.getNamed<ProfileService>(Types.Service, Targets.Service.model.ProfileService);
        listingItemTemplateService = app.IoC.getNamed<ListingItemTemplateService>(Types.Service, Targets.Service.model.ListingItemTemplateService);
        paymentInformationService = app.IoC.getNamed<PaymentInformationService>(Types.Service, Targets.Service.model.PaymentInformationService);

        // clean up the db, first removes all data and then seeds the db with default data
        await testDataService.clean();

        profile = await profileService.getDefault().then(value => value.toJSON());
        market = await marketService.getDefaultForProfile(profile.id).then(value => value.toJSON());

        // generate ListingItemTemplate without Escrow
        const templateGenerateParams = new GenerateListingItemTemplateParams([
            true,       // generateItemInformation
            true,       // generateItemLocation
            false,      // generateShippingDestinations
            false,      // generateItemImages
            true,       // generatePaymentInformation
            false,      // generateEscrow
            false,      // generateItemPrice
            true,       // generateMessagingInformation
            false,      // generateListingItemObjects
            false,      // generateObjectDatas
            profile.id, // profileId
            false,      // generateListingItem
            market.id   // marketId
        ]).toParamsArray();
        const listingItemTemplates = await testDataService.generate({
            model: CreatableModel.LISTINGITEMTEMPLATE,
            amount: 1,
            withRelated: true,
            generateParams: templateGenerateParams
        } as TestDataGenerateRequest);
        listingItemTemplate = listingItemTemplates[0];

    });

    afterAll(async () => {
        //
    });

    test('Should throw ValidationException because there is no payment_information_id', async () => {
        expect.assertions(1);
        await escrowService.create(testData).catch(e =>
            expect(e).toEqual(new ValidationException('Request body is not valid', []))
        );
    });

    test('Should create a new Escrow', async () => {
        testData.payment_information_id = listingItemTemplate.PaymentInformation.id;

        escrow = await escrowService.create(testData).then(value => value.toJSON());
        const result: resources.Escrow = escrow;

        expect(result.type).toBe(testData.type);
        expect(result.secondsToLock).toBe(testData.secondsToLock);
        expect(result.Ratio.buyer).toBe(testData.ratio.buyer);
        expect(result.Ratio.seller).toBe(testData.ratio.seller);

    });

    test('Should throw ValidationException because we want to create a empty Escrow', async () => {
        expect.assertions(1);
        await escrowService.create({} as EscrowCreateRequest).catch(e =>
            expect(e).toEqual(new ValidationException('Request body is not valid', []))
        );
    });

    test('Should list Escrows with our new create one', async () => {
        const escrows: resources.Escrow[] = await escrowService.findAll().then(value => value.toJSON());
        expect(escrows.length).toBe(1);

        const result: resources.Escrow = escrows[0];

        expect(result.type).toBe(testData.type);
        expect(result.secondsToLock).toBe(testData.secondsToLock);
        expect(result.Ratio).toBe(undefined); // doesnt fetch related
    });

    test('Should return one Escrow', async () => {
        const result: resources.Escrow = await escrowService.findOne(escrow.id).then(value => value.toJSON());

        expect(result.type).toBe(testData.type);
        expect(result.secondsToLock).toBe(testData.secondsToLock);
        expect(result.Ratio.buyer).toBe(testData.ratio.buyer);
        expect(result.Ratio.seller).toBe(testData.ratio.seller);
    });

    test('Should update the Escrow', async () => {
        const result: resources.Escrow = await escrowService.update(escrow.id, testDataUpdated).then(value => value.toJSON());

        expect(result.type).toBe(testDataUpdated.type);
        expect(result.secondsToLock).toBe(testDataUpdated.secondsToLock);
        expect(result.Ratio.buyer).toBe(testDataUpdated.ratio.buyer);
        expect(result.Ratio.seller).toBe(testDataUpdated.ratio.seller);
    });

    test('Should delete the Escrow', async () => {
        expect.assertions(3);

        // delete Escrow
        await escrowService.destroy(escrow.id);
        await escrowService.findOne(escrow.id)
            .catch(e =>
                expect(e).toEqual(new NotFoundException(escrow.id))
            );

        // delete ListingItemTemplate
        await listingItemTemplateService.destroy(listingItemTemplate.id);
        await listingItemTemplateService.findOne(listingItemTemplate.id)
            .catch(e =>
                expect(e).toEqual(new NotFoundException(listingItemTemplate.id))
            );

        // PaymentInformation should have been removed too
        await paymentInformationService.findOne(listingItemTemplate.PaymentInformation.id)
            .catch(e =>
                expect(e).toEqual(new NotFoundException(listingItemTemplate.PaymentInformation.id))
            );
    });

});
