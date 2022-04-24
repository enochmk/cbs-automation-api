import * as yup from 'yup';

import schema from './schema';

export const requestSchema = yup.object({
	body: yup.object({
		requestID: schema.requestID,
		agentID: schema.name,
		msisdn: schema.msisdn,
	}),
});

export const batchRequestSchema = yup.object({
	body: yup.object({
		requestID: schema.requestID,
		agentID: schema.name,
	}),
	file: yup.object({
		fieldname: schema.name,
		originalname: schema.name,
		destination: schema.name,
		filename: schema.name,
		path: schema.name,
		size: yup.number().required(),
		//		mimetype: yup.string().oneOf(['text/plain']).required(),
	}),
});

export type RequestInput = yup.InferType<typeof requestSchema>['body'];

export type BatchRequestInput = yup.InferType<typeof batchRequestSchema>['body'];
