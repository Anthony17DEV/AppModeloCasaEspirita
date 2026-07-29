import React, { useState } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F4F6F8';

export default function AdminUsuariosScreen() {
	const [busca, setBusca] = useState('');
	const [filtro, setFiltro] = useState('Todos');

	const [modalVisivel, setModalVisivel] = useState(false);
	const [modoEdicao, setModoEdicao] = useState(false);
	const [usuarioEditandoId, setUsuarioEditandoId] = useState<number | null>(null);

	const [formNome, setFormNome] = useState('');
	const [formEmail, setFormEmail] = useState('');
	const [formRole, setFormRole] = useState('Visitante');

	const [usuarios, setUsuarios] = useState([
		{ id: 1, nome: 'Ricardo Mendes', email: 'ricardo@email.com', status: 'Pendente', role: 'Visitante' },
		{ id: 2, nome: 'Maria Oliveira', email: 'maria@email.com', status: 'Aprovado', role: 'Associado' },
		{ id: 3, nome: 'André Souza', email: 'andre@email.com', status: 'Aprovado', role: 'Voluntário' },
	]);

	const abrirModalCriar = () => {
		setModoEdicao(false);
		setFormNome(''); setFormEmail(''); setFormRole('Visitante');
		setModalVisivel(true);
	};

	const abrirModalEditar = (user: any) => {
		setModoEdicao(true);
		setUsuarioEditandoId(user.id);
		setFormNome(user.nome); setFormEmail(user.email); setFormRole(user.role);
		setModalVisivel(true);
	};

	const handleSalvar = () => {
		if (!formNome || !formEmail) {
			Alert.alert("Erro", "Preencha o nome e o e-mail.");
			return;
		}

		if (modoEdicao && usuarioEditandoId) {
			setUsuarios(prev => prev.map(u =>
				u.id === usuarioEditandoId ? { ...u, nome: formNome, email: formEmail, role: formRole } : u
			));
			Alert.alert("Sucesso", "Usuário atualizado!");
		} else {
			const novoId = Math.floor(Math.random() * 10000);
			setUsuarios([{ id: novoId, nome: formNome, email: formEmail, status: 'Aprovado', role: formRole }, ...usuarios]);
			Alert.alert("Sucesso", "Novo usuário criado!");
		}
		setModalVisivel(false);
	};

	const handleExcluir = (id: number, nome: string) => {
		Alert.alert("Atenção, Administrador", `Tem certeza que deseja EXCLUIR o usuário ${nome}? Essa ação não tem volta.`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Sim, Excluir", style: "destructive", onPress: () => {
					setUsuarios(prev => prev.filter(u => u.id !== id));
				}
			}
		]);
	};

	const handleAprovar = (id: number, nome: string) => {
		setUsuarios(prev => prev.map(u => u.id === id ? { ...u, status: 'Aprovado' } : u));
		Alert.alert("Sucesso", `${nome} agora é um membro Aprovado!`);
	};

	const usuariosFiltrados = usuarios.filter(u => {
		const matchBusca = u.nome.toLowerCase().includes(busca.toLowerCase());
		const matchFiltro = filtro === 'Todos' ? true : filtro === 'Pendentes' ? u.status === 'Pendente' : u.status === 'Aprovado';
		return matchBusca && matchFiltro;
	});

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Gestão de Usuários</Text>
				<View style={{ width: 40 }} />
			</View>

			<View style={styles.searchSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#95A5A6" />
					<TextInput
						style={styles.searchInput}
						placeholder="Buscar por nome..."
						value={busca} onChangeText={setBusca}
					/>
				</View>
				<View style={styles.filterRow}>
					{['Todos', 'Pendentes', 'Aprovados'].map(f => (
						<TouchableOpacity key={f} style={[styles.filterBtn, filtro === f && styles.filterBtnActive]} onPress={() => setFiltro(f)}>
							<Text style={[styles.filterText, filtro === f && styles.filterTextActive]}>{f}</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={styles.resultsCount}>{usuariosFiltrados.length} usuário(s) encontrado(s)</Text>

				{usuariosFiltrados.map(user => (
					<View key={user.id} style={styles.userCard}>
						<View style={styles.userAvatar}>
							<Text style={styles.avatarLetter}>{user.nome[0]}</Text>
						</View>

						<View style={styles.userInfo}>
							<Text style={styles.userName}>{user.nome}</Text>
							<Text style={styles.userEmail}>{user.email}</Text>
							<View style={styles.tagRow}>
								<View style={[styles.statusTag, user.status === 'Pendente' ? styles.tagYellow : styles.tagGreen]}>
									<Text style={styles.tagText}>{user.status}</Text>
								</View>
								<Text style={styles.roleText}>{user.role}</Text>
							</View>
						</View>

						<View style={styles.actionsColumn}>
							{user.status === 'Pendente' && (
								<TouchableOpacity style={styles.approveBtn} onPress={() => handleAprovar(user.id, user.nome)}>
									<Ionicons name="checkmark-circle" size={26} color="#2E7D32" />
								</TouchableOpacity>
							)}
							<TouchableOpacity style={styles.iconBtn} onPress={() => abrirModalEditar(user)}>
								<Ionicons name="create-outline" size={22} color={COR_PRIMARIA} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.iconBtn} onPress={() => handleExcluir(user.id, user.nome)}>
								<Ionicons name="trash-outline" size={22} color="#D32F2F" />
							</TouchableOpacity>
						</View>
					</View>
				))}
				<View style={{ height: 100 }} />
			</ScrollView>

			<TouchableOpacity style={styles.fab} onPress={abrirModalCriar} activeOpacity={0.8}>
				<Ionicons name="add" size={32} color={COR_PRIMARIA} />
			</TouchableOpacity>

			<Modal visible={modalVisivel} animationType="slide" transparent={true} onRequestClose={() => setModalVisivel(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)}>
								<Ionicons name="close" size={28} color="#333" />
							</TouchableOpacity>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Nome Completo</Text>
							<TextInput style={styles.modalInput} value={formNome} onChangeText={setFormNome} placeholder="Ex: João da Silva" />
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>E-mail</Text>
							<TextInput style={styles.modalInput} value={formEmail} onChangeText={setFormEmail} keyboardType="email-address" placeholder="joao@email.com" autoCapitalize="none" />
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Nível de Acesso</Text>
							<View style={styles.roleSelector}>
								{['Visitante', 'Associado', 'Admin'].map(role => (
									<TouchableOpacity
										key={role}
										style={[styles.roleOption, formRole === role && styles.roleOptionActive]}
										onPress={() => setFormRole(role)}
									>
										<Text style={[styles.roleOptionText, formRole === role && styles.roleOptionTextActive]}>{role}</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						<TouchableOpacity style={styles.modalSaveBtn} onPress={handleSalvar}>
							<Text style={styles.modalSaveBtnText}>{modoEdicao ? 'Atualizar Dados' : 'Criar Usuário'}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	headerBar: {
		backgroundColor: COR_PRIMARIA, paddingTop: Platform.OS === 'ios' ? 55 : 45,
		paddingBottom: 20, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 8, zIndex: 10,
	},
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	searchSection: { backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
	searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', paddingHorizontal: 15, height: 50, borderRadius: 15, marginBottom: 15 },
	searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
	filterRow: { flexDirection: 'row', gap: 10 },
	filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F2F5' },
	filterBtnActive: { backgroundColor: COR_PRIMARIA },
	filterText: { fontSize: 13, color: '#7F8C8D', fontWeight: '600' },
	filterTextActive: { color: '#FFF' },

	content: { flex: 1, padding: 20 },
	resultsCount: { fontSize: 13, color: '#95A5A6', marginBottom: 15, fontWeight: '600' },
	userCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
	userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EBF4FC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
	avatarLetter: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },
	userInfo: { flex: 1 },
	userName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
	userEmail: { fontSize: 13, color: '#7F8C8D', marginBottom: 6 },
	tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
	tagYellow: { backgroundColor: '#FFF9C4' },
	tagGreen: { backgroundColor: '#C8E6C9' },
	tagText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
	roleText: { fontSize: 11, color: '#95A5A6', fontWeight: 'bold' },
	actionsColumn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	approveBtn: { padding: 4 },
	iconBtn: { padding: 6, backgroundColor: '#F0F2F5', borderRadius: 8 },

	fab: {
		position: 'absolute', bottom: 25, right: 25,
		backgroundColor: COR_DETALHE, width: 60, height: 60, borderRadius: 30,
		justifyContent: 'center', alignItems: 'center', elevation: 10,
		shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
	},

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: 400 },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },
	inputGroup: { marginBottom: 16 },
	inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
	modalInput: { backgroundColor: '#F4F6F8', height: 55, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
	roleSelector: { flexDirection: 'row', gap: 10 },
	roleOption: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: 'transparent' },
	roleOptionActive: { backgroundColor: '#EBF4FC', borderColor: COR_PRIMARIA },
	roleOptionText: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
	roleOptionTextActive: { color: COR_PRIMARIA, fontWeight: 'bold' },
	modalSaveBtn: { backgroundColor: COR_PRIMARIA, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
	modalSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});