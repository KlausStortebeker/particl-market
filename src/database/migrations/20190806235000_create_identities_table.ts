// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as Knex from 'knex';


exports.up = (db: Knex): Promise<any> => {
    return Promise.all([

        db.schema.createTableIfNotExists('identities', (table: Knex.CreateTableBuilder) => {
            table.increments('id').primary();

            table.integer('profile_id').unsigned().notNullable();
            table.foreign('profile_id').references('id').inTable('profiles').onDelete('CASCADE');

            table.string('type').notNullable();

            table.string('wallet').notNullable().unique();
            table.string('address'); // .notNullable().unique();
            table.string('hdseedid'); // .notNullable().unique();
            table.string('path').nullable();
            table.string('mnemonic').nullable();
            table.string('passphrase').nullable();

            table.integer('image_id').unsigned().nullable();
            table.foreign('image_id').references('id').inTable('images').onDelete('CASCADE');

            table.timestamp('updated_at').defaultTo(db.fn.now());
            table.timestamp('created_at').defaultTo(db.fn.now());
        })

    ]);
};

exports.down = (db: Knex): Promise<any> => {
    return Promise.all([
        db.schema.dropTable('identities')
    ]);
};
