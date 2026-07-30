import axios from 'axios';

const BASE_URL = 'https://sistemascactus.com/apicactus/casadocaminho/';

const api = axios.create({
	baseURL: BASE_URL,
	timeout: 15000,
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
	},
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error('Erro na API:', error.response?.data || error.message);
		return Promise.reject(error);
	}
);

export const apiService = {
	api,
};