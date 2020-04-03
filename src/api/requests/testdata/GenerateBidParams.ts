// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import {MPAction} from 'omp-lib/dist/interfaces/omp-enums';

export interface GenerateBidParamsInterface {
    generateListingItem: boolean;
    toParamsArray(): boolean[];
}

export class GenerateBidParams implements GenerateBidParamsInterface {

    public generateListingItemTemplate = true;
    public generateListingItem = true;
    public listingItemId: number;

    public type: string;
    public bidder: string;
    public seller: string;
    public parentBidId: number;


    /**
     * generateParams[]:
     * [0]: generateListingItemTemplate, generate a ListingItemTemplate
     * [1]: generateListingItem, generate a ListingItem
     * [2]: listingItemId, attach bid to existing ListingItem
     * [3]: type, bid type, see MPAction
     * [4]: bidder, bidders address
     * [5]: seller, ListingItem sellers address
     * [6]: parentBidId, should be set if type !== MPA_BID
     *
     * @param generateParams
     */
    constructor(generateParams: any[] = []) {

        // set params only if there are some -> by default all are true
        if (!_.isEmpty(generateParams) ) {
            this.generateListingItemTemplate = generateParams[0] ? true : false;
            this.generateListingItem = generateParams[1] ? true : false;
            this.listingItemId = generateParams[2] ? generateParams[2] : null;

            // if item hash was given, set generateListingItem to false
            this.generateListingItem = !this.listingItemId;

            this.type = generateParams[3] ? generateParams[3] : null;
            this.bidder = generateParams[4] ? generateParams[4] : null;

            this.seller = generateParams[5] ? generateParams[5] : null;
            if (generateParams[6]) {
                this.parentBidId = generateParams[6];
            }
        }
    }

    public toParamsArray(): any[] {
        return [
            this.generateListingItemTemplate,
            this.generateListingItem,
            this.listingItemId,
            this.type,
            this.bidder,
            this.seller,
            this.parentBidId
        ];
    }

}
