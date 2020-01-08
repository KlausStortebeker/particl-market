// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

declare module 'resources' {

    interface ItemImage {
        id: number;
        hash: string;
        createdAt: Date;
        updatedAt: Date;
        featured: boolean;

        ItemImageDatas: ItemImageData[];
        ItemInformation: ItemInformation;
    }

}
