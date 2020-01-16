// Copyright (c) 2017-2020, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { injectable } from 'inversify';
import { ActionListenerInterface } from './ActionListenerInterface';
import { MarketplaceMessage } from '../messages/MarketplaceMessage';
import { MPAction } from 'omp-lib/dist/interfaces/omp-enums';
import { ListingItemAddValidator } from '../messages/validator/ListingItemAddValidator';
import { MPActionExtended } from '../enums/MPActionExtended';
import { GovernanceAction } from '../enums/GovernanceAction';
import { NotImplementedException } from '../exceptions/NotImplementedException';
import { SmsgMessageService } from '../services/model/SmsgMessageService';
import { Logger as LoggerType } from '../../core/Logger';
import { ActionMessageTypes } from '../enums/ActionMessageTypes';
import { MarketplaceMessageEvent } from '../messages/MarketplaceMessageEvent';
import { SmsgMessageStatus } from '../enums/SmsgMessageStatus';
import { BidValidator } from '../messages/validator/BidValidator';
import { BidAcceptValidator } from '../messages/validator/BidAcceptValidator';
import { BidRejectValidator } from '../messages/validator/BidRejectValidator';
import { BidCancelValidator } from '../messages/validator/BidCancelValidator';
import { EscrowLockValidator } from '../messages/validator/EscrowLockValidator';
import { EscrowRefundValidator } from '../messages/validator/EscrowRefundValidator';
import { EscrowReleaseValidator } from '../messages/validator/EscrowReleaseValidator';
import { ProposalAddValidator } from '../messages/validator/ProposalAddValidator';
import { VoteValidator } from '../messages/validator/VoteValidator';
import { EscrowCompleteValidator } from '../messages/validator/EscrowCompleteValidator';
import { OrderItemShipValidator } from '../messages/validator/OrderItemShipValidator';
import { BidService } from '../services/model/BidService';
import { EscrowRefundMessage } from '../messages/action/EscrowRefundMessage';
import { EscrowLockMessage } from '../messages/action/EscrowLockMessage';
import { BidCancelMessage } from '../messages/action/BidCancelMessage';
import { BidRejectMessage } from '../messages/action/BidRejectMessage';
import { BidAcceptMessage } from '../messages/action/BidAcceptMessage';
import { EscrowReleaseMessage } from '../messages/action/EscrowReleaseMessage';
import { EscrowCompleteMessage } from '../messages/action/EscrowCompleteMessage';
import { OrderItemShipMessage } from '../messages/action/OrderItemShipMessage';
import { VoteMessage } from '../messages/action/VoteMessage';
import { ProposalService } from '../services/model/ProposalService';
import { OrderItemStatus } from '../enums/OrderItemStatus';
import { CommentAction } from '../enums/CommentAction';
import { CommentAddValidator } from '../messages/validator/CommentValidator';
import { KVS } from 'omp-lib/dist/interfaces/common';

// TODO: rename, refactor
@injectable()
export abstract class BaseActionListenr implements ActionListenerInterface {

    public static validate(msg: MarketplaceMessage): boolean {

        switch (msg.action.type) {
            case MPAction.MPA_LISTING_ADD:
                return ListingItemAddValidator.isValid(msg);
            case MPAction.MPA_BID:
                return BidValidator.isValid(msg);
            case MPAction.MPA_ACCEPT:
                return BidAcceptValidator.isValid(msg);
            case MPAction.MPA_REJECT:
                return BidRejectValidator.isValid(msg);
            case MPAction.MPA_CANCEL:
                return BidCancelValidator.isValid(msg);
            case MPAction.MPA_LOCK:
                return EscrowLockValidator.isValid(msg);
            case MPActionExtended.MPA_REFUND:
                return EscrowRefundValidator.isValid(msg);
            case MPActionExtended.MPA_RELEASE:
                return EscrowReleaseValidator.isValid(msg);
            case MPActionExtended.MPA_COMPLETE:
                return EscrowCompleteValidator.isValid(msg);
            case MPActionExtended.MPA_SHIP:
                return OrderItemShipValidator.isValid(msg);
            case GovernanceAction.MPA_PROPOSAL_ADD:
                return ProposalAddValidator.isValid(msg);
            case GovernanceAction.MPA_VOTE:
                return VoteValidator.isValid(msg);
            case CommentAction.MPA_COMMENT_ADD:
                return CommentAddValidator.isValid(msg);
            default:
                throw new NotImplementedException();
        }
    }

    public smsgMessageService: SmsgMessageService;
    public bidService: BidService;
    public proposalService: ProposalService;
    public log: LoggerType;
    public eventType: ActionMessageTypes;

    constructor(eventType: ActionMessageTypes, smsgMessageService: SmsgMessageService, bidService: BidService,
                proposalService: ProposalService, Logger: typeof LoggerType) {
        this.log = new Logger(eventType);
        this.smsgMessageService = smsgMessageService;
        this.bidService = bidService;
        this.proposalService = proposalService;
        this.eventType = eventType;
    }

    /**
     * handle the event, called from process()
     * @param event
     */
    public abstract async onEvent(event: MarketplaceMessageEvent): Promise<SmsgMessageStatus>;

    /**
     * - validate the received MarketplaceMessage
     *   - on failure: update the SmsgMessage.status to SmsgMessageStatus.VALIDATION_FAILED
     * - call onEvent to process the message
     * - if there's no errors, update the SmsgMessage.status
     * - in case of Exception, also update the SmsgMessage.status to SmsgMessageStatus.PROCESSING_FAILED
     *
     * @param event
     * @returns {Promise<void>}
     */
    public async process(event: MarketplaceMessageEvent): Promise<void> {
        this.log.info('Received event: ', event.smsgMessage.type);

        // TODO: refactor validation

        if (BaseActionListenr.validate(event.marketplaceMessage)) {
            const isValid = await this.isValidSequence(event.marketplaceMessage);

            if (!isValid) {
                // if the sequence is not valid and if not expired, then wait to process again later
                if (event.smsgMessage.expiration >= Date.now()) {
                    this.log.error('Marketplace message has an invalid sequence. Waiting to process later. msgid: ', event.smsgMessage.msgid);
                    await this.smsgMessageService.updateStatus(event.smsgMessage.id, SmsgMessageStatus.WAITING);
                } else {
                    // expired, set processing failed.
                    this.log.error('Marketplace message has an invalid sequence and has expired. msgid: ', event.smsgMessage.msgid);
                    await this.smsgMessageService.updateStatus(event.smsgMessage.id, SmsgMessageStatus.PROCESSING_FAILED);
                }
                // skip this.onEvent()
                return;
            }

            await this.onEvent(event)
                .then(async status => {
                    // update the status based on onEvent result
                    await this.smsgMessageService.updateStatus(event.smsgMessage.id, status).then(value => value.toJSON());

                })
                .catch(async reason => {
                    // if exception was thrown, processing failed
                    // todo: handle different reasons?
                    this.log.error('ERROR: ', reason);
                    await this.smsgMessageService.updateStatus(event.smsgMessage.id, SmsgMessageStatus.PROCESSING_FAILED);
                });

        } else {
            this.log.error('event.marketplaceMessage validation failed. msgid: ', event.smsgMessage.msgid);
            await this.smsgMessageService.updateStatus(event.smsgMessage.id, SmsgMessageStatus.VALIDATION_FAILED);
        }
    }

    // TODO: refactor
    public async isValidSequence(msg: MarketplaceMessage): Promise<boolean> {

        switch (msg.action.type) {
            case MPAction.MPA_LISTING_ADD:
                return true;
            case MPAction.MPA_BID:
                return true;
            case MPAction.MPA_ACCEPT:
                // MPA_BID should exists
                // -> (msg.action as MPA_ACCEPT).bid is the hash of MPA_BID
                return await this.bidService.findOneByHash((msg.action as BidAcceptMessage).bid, true)
                    .then( () => true)
                    .catch( () => false);

            case MPAction.MPA_REJECT:
                // MPA_BID should exists
                // -> (msg.action as MPA_REJECT).bid is the hash of MPA_BID
                return await this.bidService.findOneByHash((msg.action as BidRejectMessage).bid, true)
                    .then( () => true)
                    .catch( () => false);

            case MPAction.MPA_CANCEL:
                // MPA_BID should exists
                // -> (msg.action as MPA_CANCEL).bid is the hash of MPA_BID
                return await this.bidService.findOneByHash((msg.action as BidCancelMessage).bid, true)
                    .then( () => true)
                    .catch( () => false);

            case MPAction.MPA_LOCK:
                // MPA_ACCEPT should exists
                // -> (msg.action as MPA_LOCK).bid is the hash of MPA_BID
                // -> Bid of the type MPA_BID should have ChildBid of type MPA_ACCEPT
                return await this.bidService.findOneByHash((msg.action as EscrowLockMessage).bid, true)
                    .then( (value) => {
                        const mpaBid: resources.Bid = value.toJSON();
                        const childBid: resources.Bid | undefined = _.find(mpaBid.ChildBids, (child) => {
                            return child.type === MPAction.MPA_ACCEPT;
                        });
                        return !!childBid;
                    })
                    .catch( () => false);

            case MPActionExtended.MPA_REFUND:
                // MPA_LOCK should exists
                // -> (msg.action as MPA_REFUND).bid is the hash of MPA_BID and should be found
                // -> Bid of the type MPA_BID should have ChildBid of type MPA_LOCK
                return await this.bidService.findOneByHash((msg.action as EscrowRefundMessage).bid, true)
                    .then( (value) => {
                        const mpaBid: resources.Bid = value.toJSON();
                        const childBid: resources.Bid | undefined = _.find(mpaBid.ChildBids, (child) => {
                            return child.type === MPAction.MPA_LOCK;
                        });
                        return !!childBid;
                    })
                    .catch( () => false);

            case MPActionExtended.MPA_COMPLETE:
                // MPA_LOCK should exists
                // -> (msg.action as MPA_COMPLETE).bid is the hash of MPA_BID and should be found
                // -> Bid of the type MPA_BID should have ChildBid of type MPA_LOCK
                return await this.bidService.findOneByHash((msg.action as EscrowCompleteMessage).bid, true)
                    .then( (value) => {
                        const mpaBid: resources.Bid = value.toJSON();
                        const childBid: resources.Bid | undefined = _.find(mpaBid.ChildBids, (child) => {
                            return child.type === MPAction.MPA_LOCK;
                        });
                        return !!childBid;
                    })
                    .catch( () => false);

            case MPActionExtended.MPA_SHIP:
                // MPA_COMPLETE should exists
                // -> orderItem should have status OrderItemStatus.ESCROW_COMPLETED, meaning there's no race condition
                // -> (msg.action as MPA_SHIP).bid is the hash of MPA_BID and should be found
                // -> Bid of the type MPA_BID should have ChildBid of type MPA_COMPLETE
                return await this.bidService.findOneByHash((msg.action as OrderItemShipMessage).bid, true)
                    .then( (value) => {
                        const mpaBid: resources.Bid = value.toJSON();
                        if (mpaBid.OrderItem.status !== OrderItemStatus.ESCROW_COMPLETED) {
                            return false;
                        }
                        const childBid: resources.Bid | undefined = _.find(mpaBid.ChildBids, (child) => {
                            return child.type === MPActionExtended.MPA_COMPLETE;
                        });
                        return !!childBid;
                    })
                    .catch( () => false);

            case MPActionExtended.MPA_RELEASE:
                // both MPA_COMPLETE and MPA_SHIP should exists
                // -> (msg.action as MPA_RELEASE).bid is the hash of MPA_BID and should be found
                // -> Bid of the type MPA_BID should have ChildBid of type MPA_LOCK
                return await this.bidService.findOneByHash((msg.action as EscrowReleaseMessage).bid, true)
                    .then( (value) => {
                        const mpaBid: resources.Bid = value.toJSON();
                        const completeBid: resources.Bid | undefined = _.find(mpaBid.ChildBids, (child) => {
                            return child.type === MPActionExtended.MPA_COMPLETE;
                        });
                        const shipBid: resources.Bid | undefined = _.find(mpaBid.ChildBids, (child) => {
                            return child.type === MPActionExtended.MPA_SHIP;
                        });

                        return completeBid !== undefined && shipBid !== undefined;
                    })
                    .catch( () => false);

            case GovernanceAction.MPA_PROPOSAL_ADD:
                return true;

            case GovernanceAction.MPA_VOTE:
                // MPA_PROPOSAL_ADD should exists
                // -> (msg.action as MPA_VOTE).proposalHash is the hash of Proposal
                return await this.proposalService.findOneByHash((msg.action as VoteMessage).proposalHash, true)
                    .then( () => true)
                    .catch( () => false);

            case CommentAction.MPA_COMMENT_ADD:
                // TODO: make sure for each type, the target exists
                return true;

            default:
                throw new NotImplementedException();
        }
    }

    public getKVSValueByKey(values: resources.BidData[] | KVS[], keyToFind: string): string | number | undefined {
        const kvsValue = _.find(values, value => {
            return value.key === keyToFind;
        });
        return kvsValue ? kvsValue.value : undefined;
    }
}
