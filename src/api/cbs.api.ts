import axios from 'axios';
import config from 'config';
import xml2js from 'xml2js';

import { ICbs } from '../interfaces/Cbs.interface';
import { systems } from '../helpers/constants';
import HttpError from '../utils/errors/HttpError';
import messages from '../utils/messages/cbs.messages';
import cleanXml from '../helpers/cleanXml';
import { getPaymentMode } from '../helpers/utilities';

const URL: string = config.get('api.cbs.url');
const USERNAME: string = config.get('api.cbs.username');
const PASSWORD: string = config.get('api.cbs.password');
const SUCCESS_CODE: string = '405000000';
const SYSTEM: string = systems.CBS;

export const integrationEnquiry = async (requestID: string, msisdn: string) => {
	const soapActionConfig = {
		headers: {
			'Content-Type': 'text/xml',
			SoapAction: 'IntegrationEnquiry',
		},
	};

	const soapRequest = `
		<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bus="http://www.huawei.com/bme/cbsinterface/cbs/businessmgrmsg" xmlns:com="http://www.huawei.com/bme/cbsinterface/common" xmlns:bus1="http://www.huawei.com/bme/cbsinterface/cbs/businessmgr">
		<soapenv:Header/>
		<soapenv:Body>
				<bus:IntegrationEnquiryRequestMsg>
					<RequestHeader>
							<com:CommandId>IntegrationEnquiry</com:CommandId>
							<com:Version>1</com:Version>
							<com:TransactionId></com:TransactionId>
							<com:SequenceId>1</com:SequenceId>
							<com:RequestType>Event</com:RequestType>
							<com:SessionEntity>
								<com:Name>${USERNAME}</com:Name>
								<com:Password>${PASSWORD}</com:Password>
								<com:RemoteAddress></com:RemoteAddress>
							</com:SessionEntity>
							<com:SerialNo>${requestID}</com:SerialNo>
					</RequestHeader>
					<IntegrationEnquiryRequest>
							<bus1:SubscriberNo>${msisdn}</bus1:SubscriberNo>
							<bus1:QueryType>0</bus1:QueryType>
					</IntegrationEnquiryRequest>
					</bus:IntegrationEnquiryRequestMsg>
			</soapenv:Body>
		</soapenv:Envelope>
	`;

	const soapResponseRaw = await axios.post(URL, soapRequest, soapActionConfig);
	const soapResponseClean: string = cleanXml(soapResponseRaw.data);

	const jsonResponse = await xml2js.parseStringPromise(soapResponseClean);
	const responseData = jsonResponse['soapenv:Envelope']['soapenv:Body'][0];

	// ! fault response
	if (responseData['soapenv:Fault']) {
		const faultMessage = responseData['soapenv:Fault'][0].faultString[0];
		throw new HttpError(faultMessage, 500, SYSTEM);
	}

	const integrationEnquiryResultMsg =
		jsonResponse['soapenv:Envelope']['soapenv:Body'][0].IntegrationEnquiryResultMsg[0];

	const resultCode: string = integrationEnquiryResultMsg.ResultHeader[0].ResultCode[0]._;
	const resultDesc: string = integrationEnquiryResultMsg.ResultHeader[0].ResultDesc[0]._;

	// ! not a successful response
	if (resultCode !== SUCCESS_CODE) {
		if (resultDesc.includes(messages.CBS_ERROR_MESSAGE)) {
			throw new HttpError(messages.SYSTEM_BUSY, 503, SYSTEM);
		}
		throw new HttpError(resultDesc, 400, SYSTEM);
	}

	const cbsInfo: ICbs = {
		state:
			integrationEnquiryResultMsg.IntegrationEnquiryResult[0].SubscriberState[0].LifeCycleState[0],
		paidMode:
			integrationEnquiryResultMsg.IntegrationEnquiryResult[0].SubscriberInfo[0].Subscriber[0]
				.PaidMode[0],
		activationYear:
			integrationEnquiryResultMsg.IntegrationEnquiryResult[0].SubscriberState[0].FirstActiveDate[0],
		paidModeName: 'PREPAID',
	};

	cbsInfo.paidModeName = getPaymentMode(cbsInfo.paidMode);
	cbsInfo.activationYear = cbsInfo.state === '1' ? '0' : cbsInfo.activationYear;
	cbsInfo.activationYear =
		typeof cbsInfo.activationYear !== 'string' ? '0' : cbsInfo.activationYear;

	return cbsInfo;
};

export const customerDetails = async (requestID: string, msisdn: string) => {
	const soapActionConfig = {
		headers: {
			'Content-Type': 'text/xml',
			SoapAction: 'QueryBasicInfo',
		},
	};

	const request = `
	<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:bus='http://www.huawei.com/bme/cbsinterface/cbs/businessmgrmsg' xmlns:com='http://www.huawei.com/bme/cbsinterface/common' xmlns:bus1='http://www.huawei.com/bme/cbsinterface/cbs/businessmgr'>
      <soapenv:Header/>
      <soapenv:Body>
        <bus:QueryBasicInfoRequestMsg>
            <RequestHeader>
              <com:CommandId>QueryBasicInfo</com:CommandId>
              <com:Version>1</com:Version>
              <com:TransactionId></com:TransactionId>
              <com:SequenceId>1</com:SequenceId>
              <com:RequestType>Event</com:RequestType>
              <com:SessionEntity>
                  <com:Name>${USERNAME}</com:Name>
                  <com:Password>${PASSWORD}</com:Password>
                  <com:RemoteAddress></com:RemoteAddress>
              </com:SessionEntity>
              <com:SerialNo>${requestID}</com:SerialNo>
            </RequestHeader>
            <QueryBasicInfoRequest>
              <bus1:SubscriberNo>${msisdn}</bus1:SubscriberNo>
              <bus1:QueryType>1</bus1:QueryType>
            </QueryBasicInfoRequest>
        </bus:QueryBasicInfoRequestMsg>
      </soapenv:Body>
  </soapenv:Envelope>
	`;

	const soapResponseRaw = await axios.post(URL, request, soapActionConfig);
	const soapResponseClean: string = cleanXml(soapResponseRaw.data);

	const jsonResponse = await xml2js.parseStringPromise(soapResponseClean);
	const responseData = jsonResponse['soapenv:Envelope']['soapenv:Body'][0];

	// ! fault response
	if (responseData['soapenv:Fault']) {
		const faultMessage = responseData['soapenv:Fault'][0].faultString[0];
		throw new HttpError(`${faultMessage}`, 500, SYSTEM);
	}

	const queryBasicInfoResultMsg =
		jsonResponse['soapenv:Envelope']['soapenv:Body'][0].QueryBasicInfoResultMsg[0];

	const resultCode: string = queryBasicInfoResultMsg.ResultHeader[0].ResultCode[0]._;
	const resultDesc: string = queryBasicInfoResultMsg.ResultHeader[0].ResultDesc[0]._;

	// ! not a successful response
	if (resultCode !== SUCCESS_CODE) {
		if (resultDesc.includes(messages.CBS_ERROR_MESSAGE)) {
			throw new HttpError(messages.SYSTEM_BUSY, 503, SYSTEM);
		}
		throw new HttpError(resultDesc, 400, SYSTEM);
	}

	const queryBasicInfoResult = queryBasicInfoResultMsg.QueryBasicInfoResult[0];
	const customerName: string = queryBasicInfoResult.Customer[0].Name[0];

	return { customerName };
};
