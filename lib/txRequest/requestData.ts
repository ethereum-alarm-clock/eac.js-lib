import BigNumber from "bignumber.js";

interface IClaimData {
  claimedBy: string;
  claimDeposit: BigNumber;
  paymentModifier: number;
  requiredDeposit: BigNumber;
}

interface IMeta {
  createdBy: string;
  owner: string;
  isCancelled: boolean;
  wasCalled: boolean;
  wasSuccessful: boolean;
}

interface IPaymentData {
  feeRecipient: string;
  bountyBenefactor: string;
  fee: BigNumber;
  feeOwed: BigNumber;
  bounty: BigNumber;
  bountyOwed: BigNumber;
}

interface ISchedule {
  claimWindowSize: BigNumber;
  freezePeriod: BigNumber;
  reservedWindowSize: BigNumber;
  temporalUnit: number;
  windowSize: BigNumber;
  windowStart: BigNumber;
}

interface ITxData {
  callGas: BigNumber;
  callValue: BigNumber;
  gasPrice: BigNumber;
  toAddress: string;
}

interface IRequestData {
  claimData: IClaimData;
  meta: IMeta;
  paymentData: IPaymentData;
  schedule: ISchedule;
  txData: ITxData;
}

export default class RequestData implements IRequestData {

  public claimData: IClaimData = {} as IClaimData;
  public meta: IMeta = {} as IMeta;
  public paymentData: IPaymentData = {} as IPaymentData;
  public schedule: ISchedule = {} as ISchedule;
  public txData: ITxData = {} as ITxData;

  public txRequest: any;

  constructor(data: any, txRequest: any) {
    if (typeof data === "undefined" || typeof txRequest === "undefined") {
      throw new Error("Cannot call the constructor directly.");
    }
    this.txRequest = txRequest;
    this.fill(data);
  }

  fill(data: any) {
    this.claimData = {
      claimedBy: data[0][0],
      claimDeposit: new BigNumber(data[2][0]),
      paymentModifier: parseInt(data[3][0], 10),
      requiredDeposit: new BigNumber(data[2][14]),
    };

    this.meta = {
      createdBy: data[0][1],
      owner: data[0][2],
      isCancelled: data[1][0],
      wasCalled: data[1][1],
      wasSuccessful: data[1][2],
    };

    this.paymentData = {
      feeRecipient: data[0][3],
      bountyBenefactor: data[0][4],
      fee: new BigNumber(data[2][1]),
      feeOwed: new BigNumber(data[2][2]),
      bounty: new BigNumber(data[2][3]),
      bountyOwed: new BigNumber(data[2][4]),
    };

    this.schedule = {
      claimWindowSize: new BigNumber(data[2][5]),
      freezePeriod: new BigNumber(data[2][6]),
      reservedWindowSize: new BigNumber(data[2][7]),
      temporalUnit: parseInt(data[2][8], 10),
      windowSize: new BigNumber(data[2][9]),
      windowStart: new BigNumber(data[2][10]),
    };

    this.txData = {
      callGas: new BigNumber(data[2][11]),
      callValue: new BigNumber(data[2][12]),
      gasPrice: new BigNumber(data[2][13]),
      toAddress: data[0][5],
    };
  }

  static from(txRequest: any): Promise<any> {
    return new Promise((resolve, reject) => {
      txRequest.requestData.call({ gas: 3000000 }, (err: any, data: any) => {
        if (err) reject(err);
        else {
          resolve(new RequestData(data, txRequest));
        }
      });
    });
  }

  refresh() {
    return new Promise((resolve, reject) => {
      this.txRequest.requestData.call((err, data) => {
        if (err) reject(err);
        else {
          this.fill(data);
          resolve(true);
        }
      });
    });
  }
}
