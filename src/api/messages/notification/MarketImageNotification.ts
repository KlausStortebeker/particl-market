// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { ActionNotificationInterface } from './ActionNotificationInterface';

export class MarketImageNotification implements ActionNotificationInterface {

    public hash: string;
    public marketHash: string;
}
