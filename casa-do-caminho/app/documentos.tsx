import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator, StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F8F9FA';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	let texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const start = texto.indexOf('{');
		const end = texto.lastIndexOf('}');
		if (start !== -1 && end !== -1 && start < end) {
			return JSON.parse(texto.substring(start, end + 1));
		}
	} catch (e) { }
	return null;
};

const normalizarVisibilidade = (valor: any) =>
	String(valor || '')
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase();

const ehDocumentoPrivado = (valor: any) =>
	normalizarVisibilidade(valor) === 'PRIVADO';

const ehDocumentoPublico = (valor: any) =>
	normalizarVisibilidade(valor) === 'PUBLICO';

export default function DocumentosScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [documentos, setDocumentos] = useState<any[]>([]);
	const [nomeCasa, setNomeCasa] = useState('Instituição');

	const carregarDocumentos = async () => {
		setIsLoading(true);

		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigoCasa = '';
			let nivel = '';
			let idUsuario = 0;

			if (session) {
				const user = JSON.parse(session);
				codigoCasa = String(user.codigo_casa || '').trim();
				nivel = String(user.nivel_acesso || '').trim().toUpperCase();
				idUsuario = Number(user.id || user.id_usuario || 0);
			}

			if (!codigoCasa) {
				setDocumentos([]);
				return;
			}

			const codigoCasaQuery = encodeURIComponent(codigoCasa);
			const nivelQuery = encodeURIComponent(nivel);

			const resInst = await apiService.api.get(
				`api_listar_instituicoes.php?codigo_casa=${codigoCasaQuery}&nivel=${nivelQuery}`
			);
			const resDataInst = parseJSONSeguro(resInst.data);

			if (resDataInst?.success && Array.isArray(resDataInst.data)) {
				const casaEncontrada = resDataInst.data.find(
					(c: any) => String(c.codigo) === String(codigoCasa)
				);

				if (casaEncontrada) {
					setNomeCasa(casaEncontrada.nome);
				}
			}

			const res = await apiService.api.get(
				`api_listar_documentos_geral.php?codigo_casa=${codigoCasaQuery}&id_usuario=${idUsuario}&nivel=${nivelQuery}`
			);
			const resData = parseJSONSeguro(res.data);

			if (resData?.success && Array.isArray(resData.data)) {
				const podeVerPrivados = nivel === 'DIRETORIA' || nivel === 'ADMINISTRADOR';

				const listaPermitida = resData.data.filter((item: any) => {
					if (podeVerPrivados) return true;
					return ehDocumentoPublico(item?.visibilidade);
				});

				setDocumentos(listaPermitida);
			} else {
				setDocumentos([]);
			}
		} catch (error) {
			console.log('[DOCUMENTOS] Erro ao carregar:', error);
			Alert.alert('Erro', 'Falha de comunicação ao carregar documentos.');
			setDocumentos([]);
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarDocumentos();
		}, [])
	);

	const handleAbrirArquivo = async (url: string) => {
		if (!url) {
			Alert.alert("Atenção", "O link deste arquivo é inválido.");
			return;
		}

		const baseURL = apiService.api.defaults.baseURL || '';
		const urlCompleta = url.startsWith('http') ? url : `${baseURL.replace(/\/api$/, '')}/${url}`;

		try {
			await WebBrowser.openBrowserAsync(urlCompleta);
		} catch (e) {
			Alert.alert("Erro", "Não foi possível abrir o arquivo.");
		}
	};

	return (
		<View style={styles.container}>
			<RNStatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle} numberOfLines={1}>Documentos</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => { }}>
					<Feather name="power" size={24} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={styles.banner}>
					<Ionicons name="information-circle-outline" size={24} color={COR_PRIMARIA} />
					<Text style={styles.bannerText}>
						Documentos oficiais, regimentos e arquivos da instituição <Text style={{ fontWeight: 'bold' }}>{nomeCasa}</Text>.
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Arquivos Disponíveis</Text>

					{isLoading ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
					) : (
						documentos.length === 0 ? (
							<View style={styles.emptyState}>
								<Feather name="folder-minus" size={36} color="#95A5A6" />
								<Text style={styles.emptyText}>Nenhum documento publicado no momento.</Text>
							</View>
						) : (
							documentos.map((item) => (
								<View key={item.id} style={styles.docCard}>
									<View style={styles.docIconContainer}>
										<Ionicons
											name={item.tipo === 'imagem' ? 'image-outline' : 'document-text-outline'}
											size={28}
											color={COR_PRIMARIA}
										/>
									</View>

									<View style={styles.docInfo}>
										<Text style={styles.docTitle} numberOfLines={2}>
											{item.titulo}
											{ehDocumentoPrivado(item.visibilidade) && (
												<Text style={{ color: '#D32F2F', fontSize: 12 }}> 🔒 [Restrito]</Text>
											)}
										</Text>
										<Text style={styles.docDesc}>
											{ehDocumentoPrivado(item.visibilidade) ? 'Documento Interno da Diretoria' : 'Documento Público'} • {item.data_cadastro}
										</Text>
									</View>

									<View style={styles.docActions}>
										<TouchableOpacity
											style={styles.actionBtn}
											onPress={() => handleAbrirArquivo(item.url)}
										>
											<Ionicons name="eye-outline" size={22} color={COR_PRIMARIA} />
										</TouchableOpacity>
									</View>
								</View>
							))
						)
					)}
				</View>

				<View style={{ height: 40 }} />
			</ScrollView>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },

	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (RNStatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : RNStatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		elevation: 5,
		zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5, flex: 1, textAlign: 'center' },

	content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

	banner: {
		backgroundColor: '#EBF4FC',
		borderRadius: 12,
		padding: 15,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 25,
		borderWidth: 1,
		borderColor: '#D6EAF8',
	},
	bannerText: {
		flex: 1,
		marginLeft: 12,
		fontSize: 13,
		color: '#2C3E50',
		lineHeight: 20,
	},

	section: { marginBottom: 25 },
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#2C3E50',
		marginBottom: 15,
		borderLeftWidth: 4,
		borderLeftColor: COR_DETALHE,
		paddingLeft: 10,
	},

	emptyState: { padding: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0' },
	emptyText: { color: '#7F8C8D', fontSize: 13, marginTop: 10, textAlign: 'center' },

	docCard: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		elevation: 1,
	},
	docIconContainer: {
		width: 50,
		height: 50,
		borderRadius: 12,
		backgroundColor: '#F0F2F5',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 15,
	},
	docInfo: { flex: 1 },
	docTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
	docDesc: { fontSize: 12, color: '#7F8C8D', marginBottom: 6 },

	docActions: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 10,
	},
	actionBtn: {
		padding: 10,
		backgroundColor: '#F0F2F5',
		borderRadius: 10,
	}
});