// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import { CommandEnumType, Commands } from './CommandEnumType';
import { Command } from './Command';
import { RpcRequest } from '../requests/RpcRequest';
import { RpcCommandFactory } from '../factories/RpcCommandFactory';
import { NotFoundException } from '../exceptions/NotFoundException';

export abstract class BaseCommand {

    public commands: CommandEnumType;
    public command: Command;

    constructor(command: Command) {
        this.command = command;
        this.commands = Commands;
    }

    /**
     * execute the next command in data.params
     *
     * @returns {Promise<Bookshelf.Model<any>>}
     * @param request
     * @param commandFactory
     */
    public async executeNext(request: RpcRequest, commandFactory: RpcCommandFactory): Promise<BaseCommand> {
        const commandName = request.params.shift();
        // find a matching command from current commands childCommands
        const commandType = _.find(this.getChildCommands(), command => command.commandName === commandName);
        if (commandType) {
            const rpcCommand = commandFactory.get(commandType);
            // validate
            const newRpcRequest = await rpcCommand.validate(request);
            request = newRpcRequest ? newRpcRequest : request;
            // execute
            return await rpcCommand.execute(request, commandFactory);
        } else {
            throw new NotFoundException('Unknown subcommand: ' + commandName + '\n');
        }
    }

    /**
     * returns the child Commands of this command
     * @returns {Command[]}
     */
    public getChildCommands(): Command[] {
        return this.command.childCommands;
    }

    public abstract async validate(data: RpcRequest): Promise<RpcRequest>;

    public abstract help(): string;

    public abstract usage(): string;

    public abstract description(): string;

    public abstract example(): string;

    public getName(): string {
        return this.command.commandName;
    }

    public getCommand(): Command {
        return this.command;
    }

}
