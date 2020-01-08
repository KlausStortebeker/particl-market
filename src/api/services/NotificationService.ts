// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { app } from '../../app';
import { MarketplaceNotification } from '../messages/MarketplaceNotification';

export class NotificationService {

    public send(notification: MarketplaceNotification): void {
        if (app.SocketIOServer) {
            app.SocketIOServer.emit(notification.event, JSON.stringify(notification.payload));
        }
    }
}
