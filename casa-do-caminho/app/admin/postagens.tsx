import React, { useState } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

export default function AdminPostagensScreen() {
	const [modalVisivel, setModalVisivel] = useState(false);
	const [busca, setBusca] = useState('');
	const [filtro, setFiltro] = useState('Todos');

	const [formTitulo, setFormTitulo] = useState('');
	const [formConteudo, setFormConteudo] = useState('');
	const [formCategoria, setFormCategoria] = useState('Aviso');
	const [formImagem, setFormImagem] = useState('');

	const [posts, setPosts] = useState([
		{ id: 1, titulo: 'Campanha do Agasalho 2026', categoria: 'Social', data: '12/07/2026', autor: 'Diretoria', resumo: 'Iniciamos nossa coleta anual de agasalhos e cobertores...', imagem: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=400&q=80' },
		{ id: 2, titulo: 'Nova Turma de ESDE', categoria: 'Estudo', data: '10/07/2026', autor: 'Coord. Pedagógica', resumo: 'Estão abertas as inscrições para o Estudo Sistematizado...', imagem: '' },
	]);

	const abrirModalCriar = () => {
		setFormTitulo(''); setFormConteudo(''); setFormCategoria('Aviso'); setFormImagem('');
		setModalVisivel(true);
	};

	const handleSalvar = () => {
		if (!formTitulo || !formConteudo) {
			Alert.alert("Erro", "Título e Conteúdo são obrigatórios.");
			return;
		}
		const novoPost = {
			id: Math.floor(Math.random() * 10000),
			titulo: formTitulo,
			categoria: formCategoria,
			data: new Date().toLocaleDateString('pt-BR'),
			autor: 'Admin',
			resumo: formConteudo.substring(0, 80) + '...',
			imagem: formImagem
		};
		setPosts([novoPost, ...posts]);
		setModalVisivel(false);
		Alert.alert("Sucesso", "Postagem publicada no feed!");
	};

	const handleExcluir = (id: number) => {
		Alert.alert("Excluir Post", "Deseja remover esta postagem permanentemente?", [
			{ text: "Não" },
			{ text: "Sim, Excluir", style: "destructive", onPress: () => setPosts(prev => prev.filter(p => p.id !== id)) }
		]);
	};

	const getCorCategoria = (cat: string) => {
		switch (cat) {
			case 'Aviso': return '#E3F2FD';
			case 'Palestra': return '#FFF3E0';
			case 'Social': return '#E8F5E9';
			default: return '#F3E5F5';
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Gestão do Feed</Text>
				<View style={{ width: 40 }} />
			</View>

			<View style={styles.topSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#95A5A6" />
					<TextInput style={styles.searchInput} placeholder="Buscar postagens..." value={busca} onChangeText={setBusca} />
				</View>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
					{['Todos', 'Aviso', 'Palestra', 'Estudo', 'Social'].map(f => (
						<TouchableOpacity key={f} style={[styles.filterBtn, filtro === f && styles.filterBtnActive]} onPress={() => setFiltro(f)}>
							<Text style={[styles.filterText, filtro === f && styles.filterTextActive]}>{f}</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{posts.map(post => (
					<View key={post.id} style={styles.postCard}>
						{post.imagem ? <Image source={{ uri: post.imagem }} style={styles.postImg} /> : null}
						<View style={styles.postBody}>
							<View style={styles.postHeader}>
								<View style={[styles.catTag, { backgroundColor: getCorCategoria(post.categoria) }]}>
									<Text style={styles.catText}>{post.categoria}</Text>
								</View>
								<Text style={styles.postDate}>{post.data}</Text>
							</View>
							<Text style={styles.postTitle}>{post.titulo}</Text>
							<Text style={styles.postResumo} numberOfLines={2}>{post.resumo}</Text>

							<View style={styles.postFooter}>
								<Text style={styles.postAuthor}>Por: {post.autor}</Text>
								<View style={styles.actionRow}>
									<TouchableOpacity style={styles.actionIcon} onPress={() => handleExcluir(post.id)}>
										<Ionicons name="trash-outline" size={20} color="#D32F2F" />
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</View>
				))}
				<View style={{ height: 100 }} />
			</ScrollView>

			<TouchableOpacity style={styles.fab} onPress={abrirModalCriar}>
				<Ionicons name="megaphone" size={28} color={COR_PRIMARIA} />
			</TouchableOpacity>

			<Modal visible={modalVisivel} animationType="slide" transparent={true}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Nova Postagem</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.label}>Título</Text>
							<TextInput style={styles.input} value={formTitulo} onChangeText={setFormTitulo} placeholder="Chamada principal..." />

							<Text style={styles.label}>Categoria</Text>
							<View style={styles.catRow}>
								{['Aviso', 'Palestra', 'Social', 'Estudo'].map(c => (
									<TouchableOpacity key={c} style={[styles.catBtn, formCategoria === c && styles.catBtnActive]} onPress={() => setFormCategoria(c)}>
										<Text style={[styles.catBtnText, formCategoria === c && styles.catBtnTextActive]}>{c}</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.label}>Conteúdo do Post</Text>
							<TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={formConteudo} onChangeText={setFormConteudo} multiline placeholder="Escreva aqui a mensagem para os irmãos..." />

							<Text style={styles.label}>Link da Imagem (Opcional)</Text>
							<TextInput style={styles.input} value={formImagem} onChangeText={setFormImagem} placeholder="https://linkdaimagem.com/foto.jpg" />

							<TouchableOpacity style={styles.saveBtn} onPress={handleSalvar}>
								<Text style={styles.saveBtnText}>Publicar Agora</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	headerBar: { backgroundColor: COR_PRIMARIA, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomRightRadius: 25, elevation: 8 },
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	topSection: { backgroundColor: '#FFF', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
	searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', paddingHorizontal: 15, height: 45, borderRadius: 12, marginBottom: 10 },
	searchInput: { flex: 1, marginLeft: 10 },
	filterRow: { flexDirection: 'row' },
	filterBtn: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15, backgroundColor: '#F0F2F5', marginRight: 8 },
	filterBtnActive: { backgroundColor: COR_PRIMARIA },
	filterText: { fontSize: 13, color: '#7F8C8D' },
	filterTextActive: { color: '#FFF', fontWeight: 'bold' },

	content: { flex: 1, padding: 15 },
	postCard: { backgroundColor: '#FFF', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
	postImg: { width: '100%', height: 160 },
	postBody: { padding: 15 },
	postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
	catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
	catText: { fontSize: 10, fontWeight: 'bold', color: '#555' },
	postDate: { fontSize: 11, color: '#999' },
	postTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 6 },
	postResumo: { fontSize: 14, color: '#666', lineHeight: 20 },
	postFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, alignItems: 'center' },
	postAuthor: { fontSize: 12, color: '#95A5A6', fontStyle: 'italic' },
	actionRow: { flexDirection: 'row' },
	actionIcon: { padding: 5 },

	fab: { position: 'absolute', bottom: 30, right: 25, backgroundColor: COR_DETALHE, width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 10 },

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },
	label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 8 },
	input: { backgroundColor: '#F4F6F8', borderRadius: 12, padding: 15, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },
	catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	catBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0F2F5' },
	catBtnActive: { backgroundColor: COR_PRIMARIA },
	catBtnText: { fontSize: 13, color: '#666' },
	catBtnTextActive: { color: '#FFF', fontWeight: 'bold' },
	saveBtn: { backgroundColor: COR_PRIMARIA, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
	saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});