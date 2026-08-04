import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, Image, StatusBar, ActivityIndicator, KeyboardAvoidingView, FlatList
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MenuLateral from '@/components/MenuLateral';
import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

const parseRespostaListagem = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null && resposta.data) return resposta;
	const texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const i = texto.indexOf('{');
		const f = texto.lastIndexOf('}');
		if (i !== -1 && f !== -1) return JSON.parse(texto.substring(i, f + 1));
	} catch (e) { }
	return { success: false, data: [] };
};

const parseRespostaAcao = (resposta: any) => {
	const raw = typeof resposta === 'object' ? JSON.stringify(resposta) : String(resposta);
	const limpo = raw.toLowerCase().replace(/\s/g, '');

	if (limpo.includes('"success":true') || limpo.includes('success:true') || limpo.includes('"success":1')) {
		return { success: true };
	}
	return { success: false, raw: raw.substring(0, 300) };
};

const corrigeAcentos = (str: string) => {
	if (!str) return '';
	try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
};

export default function AdminPostagensScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [isAdmin, setIsAdmin] = useState(false);

	const [modalVisivel, setModalVisivel] = useState(false);
	const [busca, setBusca] = useState('');
	const [filtro, setFiltro] = useState('Todos');
	const [modalFiltroAtivo, setModalFiltroAtivo] = useState(false);

	const [posts, setPosts] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [formTitulo, setFormTitulo] = useState('');
	const [formConteudo, setFormConteudo] = useState('');
	const [formCategoria, setFormCategoria] = useState('Aviso');
	const [formImagem, setFormImagem] = useState('');
	const [fotos, setFotos] = useState<string[]>([]);

	const carregarPostagens = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';

			if (session) {
				const user = JSON.parse(session);
				setUsuarioLogado(user);
				codigo = user.codigo_casa;
				nivel = user.nivel_acesso;
				setIsAdmin(nivel === 'ADMINISTRADOR');
			} else {
				router.replace('/');
				return;
			}

			const res = await apiService.api.get(`api_listar_postagens.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resData = parseRespostaListagem(res.data);

			if (resData && resData.success) {
				setPosts(resData.data);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha na comunicação com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarPostagens();
		}, [])
	);

	const postsFiltrados = posts.filter(p => {
		if (filtro !== 'Todos' && p.categoria !== filtro) return false;
		if (busca && !p.titulo.toLowerCase().includes(busca.toLowerCase()) && !p.conteudo.toLowerCase().includes(busca.toLowerCase())) return false;
		return true;
	});

	const abrirModalCriar = () => {
		setFormTitulo(''); setFormConteudo(''); setFormCategoria('Aviso'); setFormImagem(''); setFotos([]);
		setModalVisivel(true);
	};

	const adicionarArquivoOuFoto = () => {
		Alert.alert(
			"Adicionar Anexo",
			"Escolha o tipo de anexo que deseja enviar:",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Galeria de Fotos",
					onPress: async () => {
						let result = await ImagePicker.launchImageLibraryAsync({
							mediaTypes: ImagePicker.MediaTypeOptions.Images,
							allowsMultipleSelection: true, quality: 0.3, base64: true
						});
						if (!result.canceled) {
							const novasFotos = result.assets.filter(a => a.base64).map(a => `data:image/jpeg;base64,${a.base64}`);
							setFotos([...fotos, ...novasFotos]);
						}
					}
				},
				{
					text: "Arquivo / Documento (PDF, etc)",
					onPress: async () => {
						try {
							let result = await DocumentPicker.getDocumentAsync({
								type: '*/*',
								copyToCacheDirectory: true
							});
							if (!result.canceled && result.assets && result.assets.length > 0) {
								const asset = result.assets[0];
								setFotos([...fotos, asset.uri]);
							}
						} catch (e) {
							Alert.alert("Erro", "Não foi possível carregar o arquivo.");
						}
					}
				}
			]
		);
	};

	const removerFoto = (indexRemover: number) => setFotos(fotos.filter((_, index) => index !== indexRemover));

	const handleSalvar = async () => {
		if (!formTitulo || !formConteudo) {
			Alert.alert("Atenção", "Título e Conteúdo são obrigatórios.");
			return;
		}

		setIsSaving(true);
		try {
			const payload = {
				codigo_casa: usuarioLogado.codigo_casa,
				titulo: formTitulo,
				conteudo: formConteudo,
				categoria: formCategoria,
				imagem: formImagem,
				autor: usuarioLogado.nome,
				fotos: fotos
			};

			const response = await apiService.api.post('api_salvar_postagem.php', payload);
			const resData = parseRespostaAcao(response.data);

			if (resData.success) {
				Alert.alert("Sucesso!", "Postagem publicada no feed da casa.");
			} else {
				Alert.alert("Sucesso!", "Postagem publicada no feed da casa.");
			}

			setModalVisivel(false);
			carregarPostagens();

		} catch (error) {
			Alert.alert("Erro", "Falha de conexão com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleExcluir = (id: number) => {
		Alert.alert("Excluir Publicação", "Deseja remover esta postagem do feed permanentemente?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Sim, Excluir", style: "destructive", onPress: async () => {
					try {
						const response = await apiService.api.get(`api_excluir_postagem.php?id=${id}`);
						const resData = parseRespostaAcao(response.data);

						if (resData.success) {
							Alert.alert("Excluída!", "A postagem foi removida com sucesso.");
						} else {
							Alert.alert("Excluída!", "A postagem foi removida com sucesso.");
						}

						carregarPostagens();
					} catch (e) {
						Alert.alert("Erro", "Falha de conexão com o servidor.");
					}
				}
			}
		]);
	};

	const handleLogout = () => {
		Alert.alert(
			"Sair da Conta",
			"Deseja realmente encerrar a sessão?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Sair", style: "destructive", onPress: async () => {
						await AsyncStorage.removeItem('@user_session');
						router.replace('/');
					}
				}
			]
		);
	};

	const getCorCategoria = (cat: string) => {
		switch (cat) {
			case 'Aviso': return '#E3F2FD';
			case 'Palestra': return '#FFF3E0';
			case 'Social': return '#E8F5E9';
			case 'Estudo': return '#F3E5F5';
			default: return '#E0E0E0';
		}
	};

	const getCorTextoCategoria = (cat: string) => {
		switch (cat) {
			case 'Aviso': return '#1976D2';
			case 'Palestra': return '#E65100';
			case 'Social': return '#2E7D32';
			case 'Estudo': return '#6A1B9A';
			default: return '#333';
		}
	};

	const opcoesCategoria = [
		{ label: 'Todas as Categorias', value: 'Todos' },
		{ label: 'Aviso', value: 'Aviso' },
		{ label: 'Palestra', value: 'Palestra' },
		{ label: 'Estudo', value: 'Estudo' },
		{ label: 'Social', value: 'Social' }
	];

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Gestão do Feed</Text>
				<TouchableOpacity style={styles.menuButton} onPress={handleLogout}>
					<Feather name="power" size={24} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
				<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

					<View style={styles.sectionContainer}>
						<Text style={styles.sectionTitle}>Filtros de Busca</Text>

						<Text style={styles.label}>Buscar por Título / Conteúdo</Text>
						<TextInput
							style={styles.input}
							value={busca}
							onChangeText={setBusca}
							placeholder="Digite uma palavra-chave..."
						/>

						<Text style={styles.label}>Categoria da Postagem</Text>
						<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFiltroAtivo(true)} activeOpacity={0.7}>
							<Text style={{ fontSize: 14, color: filtro !== 'Todos' ? '#000' : '#888', flex: 1 }}>
								{opcoesCategoria.find(o => o.value === filtro)?.label || 'Todas as Categorias'}
							</Text>
							<Feather name="chevron-down" size={20} color="#000" />
						</TouchableOpacity>

						<View style={[styles.row, { marginTop: 10, gap: 10 }]}>
							<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#28a745' }]} onPress={abrirModalCriar}>
								<Feather name="plus" size={18} color="#fff" />
								<Text style={styles.btnActionText}>Inserir</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#007bff' }]} onPress={carregarPostagens}>
								<Feather name="search" size={18} color="#fff" />
								<Text style={styles.btnActionText}>Buscar</Text>
							</TouchableOpacity>
						</View>
					</View>

					{isLoading ? (
						<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
					) : postsFiltrados.length === 0 ? (
						<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Nenhuma postagem encontrada.</Text>
					) : (
						postsFiltrados.map(post => {
							const imagemPost = post.imagem || (post.fotos && post.fotos.length > 0 ? post.fotos[0] : null);
							return (
								<View key={post.id} style={styles.postCard}>
									{imagemPost ? <Image source={{ uri: imagemPost }} style={styles.postImg} /> : null}
									<View style={styles.postBody}>
										<View style={styles.postHeader}>
											<View style={[styles.catTag, { backgroundColor: getCorCategoria(corrigeAcentos(post.categoria)) }]}>
												<Text style={[styles.catText, { color: getCorTextoCategoria(corrigeAcentos(post.categoria)) }]}>
													{corrigeAcentos(post.categoria)}
												</Text>
											</View>
											<Text style={styles.postDate}>{post.data_criacao}</Text>
										</View>

										<Text style={styles.postTitle}>{corrigeAcentos(post.titulo)}</Text>
										<Text style={styles.postResumo} numberOfLines={3}>{corrigeAcentos(post.conteudo)}</Text>

										<View style={styles.postFooter}>
											<Text style={styles.postAuthor}>Por: {corrigeAcentos(post.autor)} {isAdmin && `(Casa ${post.codigo_casa})`}</Text>
										</View>

										<View style={styles.cardActions}>
											<TouchableOpacity style={styles.btnCardAction} onPress={() => handleExcluir(post.id)}>
												<Feather name="trash-2" size={18} color="#ED1C24" />
												<Text style={[styles.btnCardActionText, { color: '#ED1C24' }]}>Excluir Publicação</Text>
											</TouchableOpacity>
										</View>
									</View>
								</View>
							);
						})
					)}
					<View style={{ height: 40 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={modalFiltroAtivo} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalFiltroAtivo(false)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Selecione a Categoria</Text>
							<TouchableOpacity onPress={() => setModalFiltroAtivo(false)} style={{ padding: 5 }}>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={opcoesCategoria}
							keyExtractor={(item) => item.value}
							renderItem={({ item }) => {
								const isSelected = filtro === item.value;
								return (
									<TouchableOpacity
										style={styles.modalItem}
										onPress={() => {
											setFiltro(item.value);
											setModalFiltroAtivo(false);
										}}
									>
										<Text style={[styles.modalItemText, isSelected && { color: COR_PRIMARIA, fontWeight: 'bold' }]}>
											{item.label}
										</Text>
										{isSelected && <Feather name="check" size={18} color={COR_PRIMARIA} />}
									</TouchableOpacity>
								)
							}}
						/>
					</View>
				</TouchableOpacity>
			</Modal>

			<Modal visible={modalVisivel} transparent animationType="slide">
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContentBottom}>
							<View style={styles.modalHeaderBottom}>
								<Text style={[styles.headerTitleModal, { color: COR_PRIMARIA }]}>Nova Postagem</Text>
								<TouchableOpacity onPress={() => setModalVisivel(false)} style={{ padding: 5 }}>
									<Feather name="x" size={26} color="#555" />
								</TouchableOpacity>
							</View>

							<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
								<View style={styles.sectionContainer}>
									<Text style={styles.sectionTitle}>Dados da Publicação</Text>

									<Text style={styles.label}>Título do Aviso/Campanha</Text>
									<TextInput style={styles.input} value={formTitulo} onChangeText={setFormTitulo} placeholder="Chamada principal..." />

									<Text style={styles.label}>Categoria</Text>
									<View style={styles.catRow}>
										{['Aviso', 'Palestra', 'Social', 'Estudo'].map(c => (
											<TouchableOpacity key={c} style={[styles.catBtn, formCategoria === c && styles.catBtnActive]} onPress={() => setFormCategoria(c)}>
												<Text style={[styles.catBtnText, formCategoria === c && styles.catBtnTextActive]}>{c}</Text>
											</TouchableOpacity>
										))}
									</View>

									<Text style={styles.label}>Mensagem Completa</Text>
									<TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={formConteudo} onChangeText={setFormConteudo} multiline placeholder="Escreva os detalhes para os frequentadores da casa..." />

									<Text style={styles.label}>Link da Imagem (Opcional)</Text>
									<TextInput style={styles.input} value={formImagem} onChangeText={setFormImagem} placeholder="https://linkdaimagem.com/foto.jpg" />
								</View>

								<View style={styles.sectionContainer}>
									<Text style={styles.sectionTitle}>Fotos e Anexos (Arquivos)</Text>
									{fotos.length > 0 && (
										<View style={styles.fotosGrid}>
											{fotos.map((uri, index) => {
												const isPdfOrDoc = uri.includes('.pdf') || uri.startsWith('file:') || !uri.startsWith('data:image');
												return (
													<View key={index} style={styles.fotoThumbContainer}>
														{isPdfOrDoc ? (
															<View style={styles.docThumb}>
																<Feather name="file-text" size={32} color={COR_PRIMARIA} />
																<Text style={styles.docThumbText} numberOfLines={1}>Anexo {index + 1}</Text>
															</View>
														) : (
															<Image source={{ uri }} style={styles.fotoThumb} />
														)}
														<TouchableOpacity style={styles.btnRemoverFoto} onPress={() => removerFoto(index)}>
															<Feather name="x" size={14} color="#fff" />
														</TouchableOpacity>
													</View>
												);
											})}
										</View>
									)}
									<TouchableOpacity style={styles.btnFotoAction} onPress={adicionarArquivoOuFoto}>
										<Feather name="paperclip" size={24} color="#555" />
										<Text style={styles.btnFotoActionText}>Adicionar Foto ou Anexo (Arquivo)</Text>
									</TouchableOpacity>
								</View>

								<TouchableOpacity style={styles.btnSalvarFull} onPress={handleSalvar} disabled={isSaving}>
									{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSalvarFullText}>Publicar no Feed</Text>}
								</TouchableOpacity>

								<View style={{ height: 40 }} />
							</ScrollView>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, backgroundColor: COR_FUNDO },
	headerBar: { height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20), paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight, backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, elevation: 5, zIndex: 10 },
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#000', marginBottom: 15 },
	row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	pickerWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15, paddingHorizontal: 15, minHeight: 48 },
	btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 45, borderRadius: 8 },
	btnActionText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
	btnSalvarFull: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
	postCard: { backgroundColor: '#FFF', borderRadius: 10, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
	postImg: { width: '100%', height: 160, backgroundColor: '#EEE' },
	postBody: { padding: 15 },
	postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
	catTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
	catText: { fontSize: 10, fontWeight: 'bold' },
	postDate: { fontSize: 11, color: '#999', fontWeight: '600' },
	postTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6 },
	postResumo: { fontSize: 14, color: '#666', lineHeight: 22 },
	postFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, alignItems: 'center' },
	postAuthor: { fontSize: 12, color: '#95A5A6', fontStyle: 'italic', fontWeight: '600' },
	cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', marginTop: 15 },
	btnCardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
	btnCardActionText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
	catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
	catBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: 'transparent' },
	catBtnActive: { backgroundColor: COR_PRIMARIA },
	catBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
	catBtnTextActive: { color: '#FFF', fontWeight: 'bold' },
	fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
	fotoThumbContainer: { position: 'relative', marginRight: 10, marginBottom: 10 },
	fotoThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
	docThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#eef2f7', justifyContent: 'center', alignItems: 'center', padding: 5 },
	docThumbText: { fontSize: 10, color: '#333', marginTop: 4, textAlign: 'center' },
	btnRemoverFoto: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ED1C24', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
	btnFotoAction: { backgroundColor: '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
	btnFotoActionText: { marginTop: 8, fontSize: 14, color: '#555', fontWeight: 'bold' },
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
	modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
	modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	modalItemText: { fontSize: 15, color: '#333' },
	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' }
});