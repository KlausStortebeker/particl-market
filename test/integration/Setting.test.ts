// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import * as resources from 'resources';
import * as Faker from 'faker';
import { app } from '../../src/app';
import { Logger as LoggerType } from '../../src/core/Logger';
import { Types, Core, Targets } from '../../src/constants';
import { TestUtil } from './lib/TestUtil';
import { TestDataService } from '../../src/api/services/TestDataService';
import { ValidationException } from '../../src/api/exceptions/ValidationException';
import { NotFoundException } from '../../src/api/exceptions/NotFoundException';
import { Setting } from '../../src/api/models/Setting';
import { SettingService } from '../../src/api/services/model/SettingService';
import { ProfileService } from '../../src/api/services/model/ProfileService';
import { SettingCreateRequest } from '../../src/api/requests/model/SettingCreateRequest';
import { SettingUpdateRequest } from '../../src/api/requests/model/SettingUpdateRequest';
import { MarketService } from '../../src/api/services/model/MarketService';

describe('Setting', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);
    const testUtil = new TestUtil();

    let testDataService: TestDataService;
    let settingService: SettingService;
    let profileService: ProfileService;
    let marketService: MarketService;

    let profile: resources.Profile;
    let market: resources.Market;

    let createdSetting: resources.Setting;

    const testData = {
        key: Faker.random.uuid(),
        value: Faker.random.uuid()
    } as SettingCreateRequest;

    const testDataUpdated = {
        key: Faker.random.uuid(),
        value: Faker.random.uuid()
    } as SettingUpdateRequest;

    beforeAll(async () => {
        await testUtil.bootstrapAppContainer(app);  // bootstrap the app

        testDataService = app.IoC.getNamed<TestDataService>(Types.Service, Targets.Service.TestDataService);
        settingService = app.IoC.getNamed<SettingService>(Types.Service, Targets.Service.model.SettingService);
        profileService = app.IoC.getNamed<ProfileService>(Types.Service, Targets.Service.model.ProfileService);
        marketService = app.IoC.getNamed<MarketService>(Types.Service, Targets.Service.model.MarketService);

        // clean up the db, first removes all data and then seeds the db with default data
        await testDataService.clean();

        profile = await profileService.getDefault().then(value => value.toJSON());
        market = await marketService.getDefaultForProfile(profile.id).then(value => value.toJSON());

    });

    afterAll(async () => {
        //
    });

    test('Should create a new Setting', async () => {

        testData.profile_id = profile.id;
        testData.market_id = market.id;

        const settingModel: Setting = await settingService.create(testData);
        const result = settingModel.toJSON();
        createdSetting = result;

        // test the values
        expect(result.Profile.id).toBe(testData.profile_id);
        expect(result.Market.id).toBe(testData.market_id);
        expect(result.key).toBe(testData.key);
        expect(result.value).toBe(testData.value);
    });

    test('Should throw ValidationException because we want to create a empty Setting', async () => {
        expect.assertions(1);
        await settingService.create({} as SettingCreateRequest).catch(e =>
            expect(e).toEqual(new ValidationException('Request body is not valid', []))
        );
    });

    test('Should list Settings with our new create one', async () => {
        const settings = await settingService.findAll().then(value => value.toJSON());
        expect(settings.length).toBe(6); // 6 default ones
        const result = settings[5];

        // test the values
        expect(result.key).toBe(testData.key);
        expect(result.value).toBe(testData.value);
    });

    test('Should find all Settings by profileId', async () => {
        const settingCollection = await settingService.findAllByProfileId(profile.id);
        const setting = settingCollection.toJSON();
        expect(setting.length).toBe(6);
        const result = setting[5];

        // test the values
        expect(result.key).toBe(testData.key);
        expect(result.value).toBe(testData.value);
    });

    test('Should return one Setting using id', async () => {
        const settingModel: Setting = await settingService.findOne(createdSetting.id);
        const result = settingModel.toJSON();

        // test the values
        expect(result.Profile.id).toBe(testData.profile_id);
        expect(result.key).toBe(testData.key);
        expect(result.value).toBe(testData.value);
    });

    test('Should return one Setting using key, profileId and marketId', async () => {
        const result: resources.Setting = await settingService.findOneByKeyAndProfileIdAndMarketId(testData.key, testData.profile_id, market.id)
            .then(value => value.toJSON());

        // test the values
        expect(result.Profile.id).toBe(testData.profile_id);
        expect(result.key).toBe(testData.key);
        expect(result.value).toBe(testData.value);
    });

    test('Should update the setting', async () => {
        const settingModel: Setting = await settingService.update(createdSetting.id, testDataUpdated);
        const result = settingModel.toJSON();

        // test the values
        // expect(result.value).toBe(testDataUpdated.value);
        expect(result.key).toBe(testDataUpdated.key);
        expect(result.value).toBe(testDataUpdated.value);
    });

    test('Should delete the setting', async () => {
        expect.assertions(1);
        await settingService.destroy(createdSetting.id);
        await settingService.findOne(createdSetting.id).catch(e =>
            expect(e).toEqual(new NotFoundException(createdSetting.id))
        );
    });
});
