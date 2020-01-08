// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Knex from 'knex';


exports.up = (db: Knex): Promise<any> => {
    return Promise.all([
        db.schema.createTable('bids', (table: Knex.CreateTableBuilder) => {
            table.increments('id').primary();
            table.string('msgid'); // .notNullable().unique();

            table.string('type').notNullable();
            table.string('bidder').notNullable();
            table.string('hash').notNullable();
            table.integer('generated_at').notNullable();

            table.integer('listing_item_id').unsigned().notNullable();
            table.foreign('listing_item_id').references('id')
                .inTable('listing_items').onDelete('cascade');

            table.integer('address_id').unsigned().nullable();
            table.foreign('address_id').references('id')
                .inTable('addresses');

            table.integer('parent_bid_id').unsigned().nullable();
            table.foreign('parent_bid_id').references('id')
                .inTable('bids').onDelete('cascade');

            table.timestamp('updated_at').defaultTo(db.fn.now());
            table.timestamp('created_at').defaultTo(db.fn.now());
        })
    ]);
};

exports.down = (db: Knex): Promise<any> => {
    return Promise.all([
        db.schema.dropTable('bids')
    ]);
};
