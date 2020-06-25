// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { ItemLocationService } from '../../services/model/ItemLocationService';
import { ListingItemTemplateService } from '../../services/model/ListingItemTemplateService';
import { RpcRequest } from '../../requests/RpcRequest';
import { ItemLocationUpdateRequest } from '../../requests/model/ItemLocationUpdateRequest';
import { ItemLocation } from '../../models/ItemLocation';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { ShippingCountries } from '../../../core/helpers/ShippingCountries';
import { Commands } from '../CommandEnumType';
import { BaseCommand } from '../BaseCommand';
import { LocationMarkerUpdateRequest } from '../../requests/model/LocationMarkerUpdateRequest';
import { MissingParamException } from '../../exceptions/MissingParamException';
import { InvalidParamException } from '../../exceptions/InvalidParamException';
import { ModelNotFoundException } from '../../exceptions/ModelNotFoundException';
import { ModelNotModifiableException } from '../../exceptions/ModelNotModifiableException';

export class ItemLocationUpdateCommand extends BaseCommand implements RpcCommandInterface<ItemLocation> {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.model.ItemLocationService) public itemLocationService: ItemLocationService,
        @inject(Types.Service) @named(Targets.Service.model.ListingItemTemplateService) public listingItemTemplateService: ListingItemTemplateService
    ) {
        super(Commands.ITEMLOCATION_UPDATE);
        this.log = new Logger(__filename);
    }

    /**
     * data.params[]:
     *  [0]: listingItemTemplate, resources.ListingItemTemplate
     *  [1]: country (country/countryCode)
     *  [2]: address, optional
     *  [3]: gpsMarkerTitle, optional
     *  [4]: gpsMarkerDescription, optional
     *  [5]: gpsMarkerLatitude, optional
     *  [6]: gpsMarkerLongitude, optional
     *
     * @param data
     * @returns {Promise<ItemLocation>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<ItemLocation> {

        const listingItemTemplate: resources.ListingItemTemplate = data.params[0];
        const country = data.params[1];
        const address = data.params[2];

        // TODO: its not possible to update the description
        const updateRequest = {
            country,
            address
        } as ItemLocationUpdateRequest;

        if (data.params[5] && data.params[6]) {
            updateRequest.locationMarker = {
                title: data.params[3],
                description: data.params[4],
                lat: data.params[5],
                lng: data.params[6]
            } as LocationMarkerUpdateRequest;
        }

        return this.itemLocationService.update(listingItemTemplate.ItemInformation.ItemLocation.id, updateRequest);
    }

    /**
     * data.params[]:
     *  [0]: listingItemTemplateId
     *  [1]: country (country/countryCode)
     *  [2]: address, optional
     *  [3]: gpsMarkerTitle, optional
     *  [4]: gpsMarkerDescription, optional
     *  [5]: gpsMarkerLatitude, optional
     *  [6]: gpsMarkerLongitude, optional
     *
     * @param data
     * @returns {Promise<RpcRequest>}
     */
    public async validate(data: RpcRequest): Promise<RpcRequest> {
        if (data.params.length < 1) {
            throw new MissingParamException('listingItemTemplateId');
        } else if (data.params.length < 2) {
            throw new MissingParamException('country');
        }

        const listingItemTemplateId = data.params[0];   // required
        const country = data.params[1];                 // required
        const address = data.params[2];                 // optional
        const gpsMarkerTitle = data.params[3];          // optional
        const gpsMarkerDescription = data.params[4];    // optional
        const gpsMarkerLatitude = data.params[5];       // optional
        const gpsMarkerLongitude = data.params[6];      // optional

        if (typeof listingItemTemplateId !== 'number') {
            throw new InvalidParamException('listingItemTemplateId', 'number');
        } else if (typeof country !== 'string') {
            throw new InvalidParamException('country', 'string');
        } else if (!_.isNil(address) && typeof address !== 'string') {
            throw new InvalidParamException('address', 'string');
        }

        if (data.params.length > 3) {
            if (data.params.length < 5) {
                throw new MissingParamException('gpsMarkerDescription');
            } else if (data.params.length < 6) {
                throw new MissingParamException('gpsMarkerLatitude');
            } else if (data.params.length < 7) {
                throw new MissingParamException('gpsMarkerLongitude');
            }

            if (typeof gpsMarkerTitle !== 'string') {
                throw new InvalidParamException('gpsMarkerTitle', 'string');
            } else if (typeof gpsMarkerDescription !== 'string') {
                throw new InvalidParamException('gpsMarkerDescription', 'string');
            } else if (typeof gpsMarkerLatitude !== 'number') {
                throw new InvalidParamException('gpsMarkerLatitude', 'number');
            } else if (typeof gpsMarkerLongitude !== 'number') {
                throw new InvalidParamException('gpsMarkerLongitude', 'number');
            }
        }

        // If countryCode is country, convert to countryCode.
        // If countryCode is country code, validate, and possibly throw error.
        data.params[1] = ShippingCountries.convertAndValidate(country);

        // make sure ListingItemTemplate with the id exists
        const listingItemTemplate: resources.ListingItemTemplate = await this.listingItemTemplateService.findOne(listingItemTemplateId)
            .then(value => value.toJSON())
            .catch(reason => {
                throw new ModelNotFoundException('ListingItemTemplate');
            });

        if (_.isEmpty(listingItemTemplate.ItemInformation)) {
            throw new ModelNotFoundException('ItemInformation');
        }

        if (_.isEmpty(listingItemTemplate.ItemInformation.ItemLocation)) {
            throw new ModelNotFoundException('ItemInformation');
        }

        const isModifiable = await this.listingItemTemplateService.isModifiable(listingItemTemplate.id);
        if (!isModifiable) {
            throw new ModelNotModifiableException('ListingItemTemplate');
        }

        data.params[0] = listingItemTemplate;

        return data;
    }

    public usage(): string {
        return this.getName() + ' <listingItemTemplateId> <country> [address] [gpsMarkerTitle]'
            + ' [gpsMarkerDescription] [gpsMarkerLatitude] [gpsMarkerLongitude] ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <listingItemTemplateId>  - Numeric - The ID of the ListingItemTemplate we want to update. \n'
            + '    <country>                - String - Country, i.e. country or country code. \n'
            + '    <address>                - String - Address. \n'
            + '    <gpsMarkerTitle>         - String - Gps marker title. \n'
            + '    <gpsMarkerDescription>   - String - Gps marker text. \n'
            + '    <gpsMarkerLatitude>      - Numeric - Marker latitude position. \n'
            + '    <gpsMarkerLongitude>     - Numeric - Marker longitude position. ';
    }

    public description(): string {
        return 'Update the ItemLocation.';
    }

    public example(): string {
        return '';
    }

}
