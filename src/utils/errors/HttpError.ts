class HttpError extends Error {
	statusCode: number;

	system: string;

	constructor(message: string, statusCode: number, system: string = 'BIOSIMREG') {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode || 500;
		this.system = system;
	}
}

export default HttpError;
