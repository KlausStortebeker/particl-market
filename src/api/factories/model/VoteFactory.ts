// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { VoteMessage } from '../../messages/action/VoteMessage';
import { VoteCreateRequest } from '../../requests/model/VoteCreateRequest';
import { VoteUpdateRequest } from '../../requests/model/VoteUpdateRequest';
import { ProposalOptionService } from '../../services/model/ProposalOptionService';
import { ModelFactoryInterface } from './ModelFactoryInterface';
import { VoteCreateParams } from './ModelCreateParams';
import { ProposalCreateRequest } from '../../requests/model/ProposalCreateRequest';

export class VoteFactory implements ModelFactoryInterface {

    public log: LoggerType;

    constructor(
        @inject(Types.Service) @named(Targets.Service.model.ProposalOptionService) public proposalOptionService: ProposalOptionService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
    }

    /**
     *
     * @param voteMessage
     * @param smsgMessage
     * @param params
     * @returns {Promise<ProposalCreateRequest>}
     */
    public async get(params: VoteCreateParams, voteMessage: VoteMessage, smsgMessage?: resources.SmsgMessage): Promise<VoteCreateRequest | VoteUpdateRequest> {

        const smsgData: any = {
            postedAt: Number.MAX_SAFE_INTEGER,
            receivedAt: Number.MAX_SAFE_INTEGER,
            expiredAt: Number.MAX_SAFE_INTEGER
        };

        if (smsgMessage) {
            smsgData.postedAt = smsgMessage.sent;
            smsgData.receivedAt = smsgMessage.received;
            smsgData.expiredAt = smsgMessage.expiration;
        }

        const voteRequest = {
            msgid: params.msgid,
            signature: voteMessage.signature,
            voter: voteMessage.voter,
            ...smsgData
        } as VoteCreateRequest || VoteUpdateRequest;

        if (params) {
            voteRequest.proposal_option_id = params.proposalOption.id;
            voteRequest.weight = params.weight;
        }
        return voteRequest;
    }
}
