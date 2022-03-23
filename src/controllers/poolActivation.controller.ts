import { Request, Response } from 'express';

import asyncHandler from '../middlewares/async.middleware';
import * as poolNumberService from '../services/poolActivation.services';
import HttpError from '../utils/errors/HttpError';
import { RequestInput, BatchRequestInput } from '../validations/request.schema';

export const poolActivation = asyncHandler(
	async (req: Request<{}, {}, RequestInput>, res: Response) => {
		const data = req.body;

		const response = await poolNumberService.poolActivation(data);

		if (!response.success) {
			throw new HttpError(response.message, 400);
		}

		res.status(200).json({
			...response,
		});
	}
);

export const poolActivationBatch = asyncHandler(
	async (req: Request<{}, {}, BatchRequestInput>, res: Response) => {
		const data = req.body;
		const file = req.file;
		const shouldDownload = req.query.download;

		const response: any = await poolNumberService.poolActivationBatch(data, file);

		// condition to download or send response
		if (shouldDownload === 'true') {
			return res.download(response.destination, (err) => {
				if (err) {
					throw err;
				}
			});
		}

		return res.status(200).json({ ...response });
	}
);
