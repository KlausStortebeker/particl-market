import { Logger as LoggerType } from '../../../core/Logger';
import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Types, Core, Targets } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { Escrow } from '../../models/Escrow';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { EscrowService } from '../../services/EscrowService';

import { EscrowLockRequest } from '../../requests/EscrowLockRequest';

export class EscrowLockCommand implements RpcCommandInterface<Escrow> {

    public log: LoggerType;
    public name: string;

    constructor(
        @inject(Types.Service) @named(Targets.Service.EscrowService) private escrowService: EscrowService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
        this.name = 'lockescrow';
    }

    /**
     * data.params[]:
     * [0]: itemhash
     * [1]: nonce
     * [2]: address_id (from profile deliveryaddresses)
     * [3]: escrowid
     * [4]: memo
     * @param data
     * @returns {Promise<any>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<any> {
        return this.escrowService.lock({
            listing: data.params[0],
            nonce: data.params[1],
            address: data.params[2],
            escrow: data.params[3],
            memo: data.params[4],
            action: 'MPA_LOCK',
            item: ''
        } as EscrowLockRequest);
    }

    public help(): string {
        return 'EscrowLockCommand: TODO: Fill in help string.';
    }
}