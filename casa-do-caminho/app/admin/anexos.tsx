import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, ActivityIndicator, Image, StatusBar, KeyboardAvoidingView, Linking
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F4F6F8';

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

export default function AnexosScreen() {
	const { casaId, casaNome } = useLocalSearchParams();

	const [isLoading, setIsLoading] = useState(true);
	const [anexos, setAnexos] = useState<any[]>([]);

	const [modalVisivel, setModalVisivel] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [formTitulo, setFormTitulo] = useState('');
	const [formVisibilidade, setFormVisibilidade] = useState<'Publico' | 'Privado'>('Publico');
	const [formArquivo, setFormArquivo] = useState<{ uri: string, tipo: string, base64?: string } | null>(null);

	const carregarAnexos = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let nivel = 'ADMINISTRADOR';
			if (session) {
				const user = JSON.parse(session);
				nivel = String(user.nivel_acesso || 'ADMINISTRADOR').trim().toUpperCase();
			}

			const res = await apiService.api.get(`api_listar_anexos.php?casa_id=${casaId}&nivel=${nivel}`);
			const resData = parseJSONSeguro(res.data);

			if (resData && resData.success) {
				setAnexos(resData.data);
			} else {
				setAnexos([]);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha de comunicação com o servidor.");
			setAnexos([]);
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (!casaId) {
				Alert.alert("Erro", "Instituição não identificada.");
				router.back();
				return;
			}
			carregarAnexos();
		}, [casaId])
	);

	const abrirModalNovo = () => {
		setFormTitulo('');
		setFormVisibilidade('Publico');
		setFormArquivo(null);
		setModalVisivel(true);
	};

	const adicionarArquivo = () => {
		Alert.alert(
			"Selecionar Anexo",
			"Como deseja enviar o documento?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Galeria de Fotos",
					onPress: async () => {
						try {
							let result = await ImagePicker.launchImageLibraryAsync({
								mediaTypes: ImagePicker.MediaTypeOptions.Images,
								quality: 0.5,
								base64: true
							});
							if (!result.canceled && result.assets.length > 0) {
								const asset = result.assets[0];
								setFormArquivo({
									uri: asset.uri,
									tipo: 'imagem',
									base64: `data:image/jpeg;base64,${asset.base64}`
								});
							}
						} catch (err) {
							Alert.alert("Erro", "Não foi possível carregar a imagem.");
						}
					}
				},
				{
					text: "Documento (PDF, etc)",
					onPress: async () => {
						try {
							let result = await DocumentPicker.getDocumentAsync({
								type: '*/*',
								copyToCacheDirectory: true
							});

							if (!result.canceled && result.assets && result.assets.length > 0) {
								const asset = result.assets[0];

								const base64Str = await FileSystem.readAsStringAsync(asset.uri, {
									encoding: 'base64'
								});

								setFormArquivo({
									uri: asset.uri,
									tipo: 'documento',
									base64: `data:${asset.mimeType || 'application/pdf'};base64,${base64Str}`
								});
							}
						} catch (e: any) {
							Alert.alert("Erro ao ler documento", e?.message || "Não foi possível processar o arquivo selecionado.");
						}
					}
				}
			]
		);
	};

	const handleGravar = async () => {
		if (!formTitulo.trim()) {
			Alert.alert("Atenção", "Por favor, informe um título ou descrição para o anexo.");
			return;
		}
		if (!formArquivo || !formArquivo.base64) {
			Alert.alert("Atenção", "Por favor, selecione um arquivo ou foto para anexar.");
			return;
		}

		setIsSaving(true);
		try {
			const payload = {
				casa_id: casaId,
				titulo: formTitulo,
				tipo: formArquivo.tipo,
				visibilidade: formVisibilidade,
				base64: formArquivo.base64
			};

			const res = await apiService.api.post('api_salvar_anexo.php', payload);
			const resData = parseJSONSeguro(res.data);

			if (resData && resData.success) {
				Alert.alert("Sucesso!", "Documento salvo e anexado com sucesso!");
				setModalVisivel(false);
				carregarAnexos();
			} else {
				Alert.alert("Erro", resData?.message || "Erro ao salvar no servidor.");
			}
		} catch (error) {
			Alert.alert("Erro", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleBaixar = async (url: string) => {
		if (!url || url.trim() === '') {
			Alert.alert("Atenção", "Link do arquivo indisponível.");
			return;
		}

		try {
			let urlFormatada = url.trim();

			if (urlFormatada.startsWith('http://') || urlFormatada.startsWith('https://') || urlFormatada.startsWith('data:')) {
				await Linking.openURL(urlFormatada);
			} else {
				const dominioServidor = 'https://sistemascactus.com/apicactus/casadocaminho/';

				// Tira a barra inicial caso o banco devolva "/uploads..." para evitar //uploads
				const caminhoArquivo = urlFormatada.replace(/^\//, '');

				const urlFinal = `${dominioServidor}${caminhoArquivo}`;

				await Linking.openURL(urlFinal);
			}
		} catch (error) {
			Alert.alert("Erro ao Abrir", "Não foi possível abrir o arquivo diretamente no navegador.");
		}
	};

	const handleExcluir = (id: number, titulo: string) => {
		Alert.alert(
			"Confirmar Exclusão",
			`Deseja realmente excluir o documento "${titulo}"?`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir", style: "destructive",
					onPress: async () => {
						try {
							const res = await apiService.api.get(`api_excluir_anexo.php?id=${id}`);
							const resData = parseJSONSeguro(res.data);

							if (resData && resData.success) {
								Alert.alert("Sucesso", "Documento apagado do sistema.");
								carregarAnexos();
							} else {
								const erroCru = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data).substring(0, 300);
								Alert.alert("Erro na Resposta", resData?.message || `A API excluiu, mas respondeu com lixo:\n\n${erroCru}`);
								carregarAnexos();
							}
						} catch (error) {
							Alert.alert("Erro", "Falha de conexão com o servidor.");
						}
					}
				}
			]
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle} numberOfLines={1}>Documentos da Instituição</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={styles.headerContext}>
					<View style={styles.iconCircleContext}>
						<Feather name="folder" size={24} color={COR_PRIMARIA} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.contextTitle}>{casaNome || 'Instituição'}</Text>
						<Text style={styles.contextSub}>Gerenciamento de Arquivos e Contratos</Text>
					</View>
				</View>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : (
					<>
						<Text style={styles.listTitle}>Anexos Cadastrados ({anexos.length})</Text>

						{anexos.length === 0 ? (
							<View style={styles.emptyState}>
								<Feather name="inbox" size={40} color="#BDC3C7" />
								<Text style={styles.emptyStateText}>Nenhum documento encontrado.</Text>
								<Text style={styles.emptyStateSubText}>Toque no botão + para anexar arquivos.</Text>
							</View>
						) : (
							anexos.map((item) => (
								<View key={item.id} style={styles.itemCard}>
									<View style={styles.itemIconBox}>
										<Feather name={item.tipo === 'imagem' ? 'image' : 'file-text'} size={24} color={COR_PRIMARIA} />
									</View>

									<View style={styles.itemInfo}>
										<Text style={styles.itemTitle} numberOfLines={2}>
											{item.titulo}
											{item.visibilidade === 'Privado' && (
												<Text style={{ color: '#D32F2F' }}>  🔒</Text>
											)}
										</Text>
										<Text style={styles.itemDate}>
											{item.visibilidade === 'Privado' ? '🔒 Documento Restrito' : '🌐 Acesso Público'} • {item.data_cadastro}
										</Text>
									</View>

									<View style={styles.actionRow}>
										<TouchableOpacity style={styles.actionBtn} onPress={() => handleBaixar(item.url)}>
											<Feather name="download" size={18} color="#28a745" />
										</TouchableOpacity>

										<TouchableOpacity style={styles.actionBtn} onPress={() => handleExcluir(item.id, item.titulo)}>
											<Feather name="trash-2" size={18} color="#ED1C24" />
										</TouchableOpacity>
									</View>
								</View>
							))
						)}
					</>
				)}

				<View style={{ height: 100 }} />
			</ScrollView>

			<TouchableOpacity style={styles.fab} onPress={abrirModalNovo} activeOpacity={0.8}>
				<Ionicons name="add" size={32} color="#FFF" />
			</TouchableOpacity>

			<Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContainerBottom}>
							<View style={styles.modalHeaderTop}>
								<Text style={styles.modalTitleTop}>Novo Documento</Text>
								<TouchableOpacity onPress={() => setModalVisivel(false)}>
									<Ionicons name="close" size={28} color="#333" />
								</TouchableOpacity>
							</View>

							<ScrollView showsVerticalScrollIndicator={false}>

								<Text style={styles.inputLabel}>Nível de Acesso (Visibilidade)</Text>
								<View style={styles.typeSelector}>
									<TouchableOpacity
										style={[styles.typeOption, formVisibilidade === 'Publico' && styles.typeOptionActive]}
										onPress={() => setFormVisibilidade('Publico')}
									>
										<Feather name="globe" size={16} color={formVisibilidade === 'Publico' ? '#FFF' : '#546E7A'} />
										<Text style={[styles.typeOptionText, formVisibilidade === 'Publico' && styles.typeOptionTextActive]}>Público</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[styles.typeOption, formVisibilidade === 'Privado' && styles.typeOptionRed]}
										onPress={() => setFormVisibilidade('Privado')}
									>
										<Feather name="lock" size={16} color={formVisibilidade === 'Privado' ? '#FFF' : '#D32F2F'} />
										<Text style={[styles.typeOptionText, formVisibilidade === 'Privado' && styles.typeOptionTextActive]}>Privado (Admins)</Text>
									</TouchableOpacity>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Título ou Descrição</Text>
									<TextInput
										style={styles.modalInput}
										value={formTitulo}
										onChangeText={setFormTitulo}
										placeholder="Ex: Contrato de Locação 2024"
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Arquivo Selecionado</Text>
									{formArquivo ? (
										<View style={styles.fileSelectedBox}>
											<View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
												<Feather name={formArquivo.tipo === 'imagem' ? 'image' : 'file'} size={24} color={COR_PRIMARIA} style={{ marginRight: 10 }} />
												<Text style={styles.fileSelectedText} numberOfLines={1}>
													{formArquivo.uri.split('/').pop() || 'Arquivo anexado'}
												</Text>
											</View>
											<TouchableOpacity onPress={() => setFormArquivo(null)}>
												<Feather name="x-circle" size={20} color="#ED1C24" />
											</TouchableOpacity>
										</View>
									) : (
										<TouchableOpacity style={styles.btnSelectFile} onPress={adicionarArquivo}>
											<Feather name="upload-cloud" size={24} color="#7F8C8D" />
											<Text style={styles.btnSelectFileText}>Toque para procurar no dispositivo</Text>
										</TouchableOpacity>
									)}
								</View>

								<TouchableOpacity style={styles.modalSaveBtn} onPress={handleGravar} disabled={isSaving}>
									{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSaveBtnText}>Fazer Upload do Arquivo</Text>}
								</TouchableOpacity>

								<View style={{ height: 30 }} />
							</ScrollView>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },

	headerBar: {
		backgroundColor: COR_PRIMARIA,
		paddingTop: Platform.OS === 'ios' ? 55 : 45,
		paddingBottom: 20,
		paddingHorizontal: 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		elevation: 5,
		zIndex: 10,
	},
	backButton: { padding: 5 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },

	content: { flex: 1, padding: 15 },

	headerContext: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
	iconCircleContext: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EBF4FC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
	contextTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
	contextSub: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },

	listTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },

	emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed' },
	emptyStateText: { fontSize: 15, fontWeight: 'bold', color: '#7F8C8D', marginTop: 10 },
	emptyStateSubText: { fontSize: 13, color: '#95A5A6', marginTop: 4 },

	itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#E0E0E0' },
	itemIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F4F6F8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	itemInfo: { flex: 1 },
	itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
	itemDate: { fontSize: 12, color: '#7F8C8D', marginTop: 4 },
	actionRow: { flexDirection: 'row', gap: 10 },
	actionBtn: { padding: 8, backgroundColor: '#F4F6F8', borderRadius: 8 },

	fab: {
		position: 'absolute', bottom: 25, right: 25,
		backgroundColor: '#28a745', width: 60, height: 60, borderRadius: 30,
		justifyContent: 'center', alignItems: 'center', elevation: 10,
		zIndex: 99,
	},

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContainerBottom: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
	modalHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitleTop: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },

	typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
	typeOption: { flex: 1, height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: '#E0E0E0', gap: 6 },
	typeOptionActive: { backgroundColor: COR_PRIMARIA, borderColor: COR_PRIMARIA },
	typeOptionRed: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
	typeOptionText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
	typeOptionTextActive: { color: '#FFF', fontWeight: 'bold' },

	inputGroup: { marginBottom: 16 },
	inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 },
	modalInput: { backgroundColor: '#F4F6F8', height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },

	btnSelectFile: { backgroundColor: '#F4F6F8', height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#BDC3C7', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
	btnSelectFileText: { fontSize: 13, color: '#7F8C8D', marginTop: 8 },

	fileSelectedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#A5D6A7' },
	fileSelectedText: { fontSize: 14, color: '#2E7D32', fontWeight: 'bold' },

	modalSaveBtn: { backgroundColor: COR_PRIMARIA, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
	modalSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});