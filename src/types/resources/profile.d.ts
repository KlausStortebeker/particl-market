// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

declare module 'resources' {

    interface Profile {
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;

        ShippingAddresses: Address[];
        CryptocurrencyAddresses: CryptocurrencyAddress[];
        FavoriteItems: FavoriteItem[];
        ShoppingCart: ShoppingCart[];
        Markets: Market[];
        Identities: Identity[];
        Settings: Setting[];

    }

}
