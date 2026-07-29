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

export default function AdminCasasScreen() {
	const [busca, setBusca] = useState('');

	const [modalVisivel, setModalVisivel] = useState(false);
	const [modoEdicao, setModoEdicao] = useState(false);
	const [casaEditandoId, setCasaEditandoId] = useState<number | null>(null);

	const [nomeCasa, setNomeCasa] = useState('');
	const [cnpj, setCnpj] = useState('');
	const [cidade, setCidade] = useState('');
	const [emailAdmin, setEmailAdmin] = useState('');
	const [senhaInicial, setSenhaInicial] = useState('');
	const [chavePix, setChavePix] = useState('');

	const [casas, setCasas] = useState([
		{ id: 1, nome: 'Casa do Caminho', cnpj: '12.345.678/0001-99', cidade: 'Mossoró - RN', emailAdmin: 'admin@casadocaminho.org', pix: '12.345.678/0001-99', status: 'Ativa' },
		{ id: 2, nome: 'Centro Espírita Luz e Caridade', cnpj: '98.765.432/0001-11', cidade: 'Natal - RN', emailAdmin: 'contato@luze-caridade.org', pix: 'contato@luze-caridade.org', status: 'Ativa' },
	]);

	const abrirModalCriar = () => {
		setModoEdicao(false);
		setNomeCasa(''); setCnpj(''); setCidade(''); setEmailAdmin(''); setSenhaInicial(''); setChavePix('');
		setModalVisivel(true);
	};

	const abrirModalEditar = (casa: any) => {
		setModoEdicao(true);
		setCasaEditandoId(casa.id);
		setNomeCasa(casa.nome);
		setCnpj(casa.cnpj);
		setCidade(casa.cidade);
		setEmailAdmin(casa.emailAdmin);
		setChavePix(casa.pix);
		setSenhaInicial('******');
		setModalVisivel(true);
	};

	const handleSalvar = () => {
		if (!nomeCasa || !emailAdmin) {
			Alert.alert("Erro", "Preencha o Nome da Casa e o E-mail de Login do Administrador.");
			return;
		}

		if (modoEdicao && casaEditandoId) {
			setCasas(prev => prev.map(c =>
				c.id === casaEditandoId
					? { ...c, nome: nomeCasa, cnpj, cidade, emailAdmin, pix: chavePix }
					: c
			));
			Alert.alert("Sucesso", "Dados da Casa Espírita atualizados!");
		} else {
			const novoId = Math.floor(Math.random() * 10000);
			setCasas([
				{ id: novoId, nome: nomeCasa, cnpj, cidade, emailAdmin, pix: chavePix, status: 'Ativa' },
				...casas
			]);
			Alert.alert("Casa Cadastrada!", `A instituição foi cadastrada. O e-mail de login é: ${emailAdmin}`);
		}
		setModalVisivel(false);
	};

	const handleExcluir = (id: number, nome: string) => {
		Alert.alert("Excluir Casa Espírita", `Tem certeza que deseja remover "${nome}"? Isso revogará o acesso de login da instituição.`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Sim, Excluir", style: "destructive", onPress: () => {
					setCasas(prev => prev.filter(c => c.id !== id));
				}
			}
		]);
	};

	const casasFiltradas = casas.filter(c =>
		c.nome.toLowerCase().includes(busca.toLowerCase()) ||
		c.cidade.toLowerCase().includes(busca.toLowerCase())
	);

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Casas Espíritas</Text>
				<View style={{ width: 40 }} />
			</View>

			<View style={styles.searchSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#95A5A6" />
					<TextInput
						style={styles.searchInput}
						placeholder="Buscar por nome ou cidade..."
						value={busca}
						onChangeText={setBusca}
					/>
				</View>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<Text style={styles.resultsCount}>{casasFiltradas.length} Casa(s) Espírita(s) Cadastrada(s)</Text>

				{casasFiltradas.map(casa => (
					<View key={casa.id} style={styles.card}>
						<View style={styles.cardHeader}>
							<View style={styles.iconCircle}>
								<Ionicons name="business" size={24} color={COR_PRIMARIA} />
							</View>
							<View style={styles.cardHeaderInfo}>
								<Text style={styles.casaTitle}>{casa.nome}</Text>
								<Text style={styles.casaCidade}>{casa.cidade}</Text>
							</View>
							<View style={styles.badgeAtivo}>
								<Text style={styles.badgeText}>{casa.status}</Text>
							</View>
						</View>

						<View style={styles.divider} />

						<View style={styles.detailsRow}>
							<Ionicons name="mail-outline" size={16} color="#7F8C8D" />
							<Text style={styles.detailsText}>Login Admin: <Text style={styles.boldText}>{casa.emailAdmin}</Text></Text>
						</View>

						<View style={styles.detailsRow}>
							<Ionicons name="document-text-outline" size={16} color="#7F8C8D" />
							<Text style={styles.detailsText}>CNPJ: {casa.cnpj || 'Não informado'}</Text>
						</View>

						<View style={styles.actionsRow}>
							<TouchableOpacity style={styles.btnEditar} onPress={() => abrirModalEditar(casa)}>
								<Ionicons name="create-outline" size={18} color={COR_PRIMARIA} />
								<Text style={styles.btnEditarText}>Editar</Text>
							</TouchableOpacity>

							<TouchableOpacity style={styles.btnExcluir} onPress={() => handleExcluir(casa.id, casa.nome)}>
								<Ionicons name="trash-outline" size={18} color="#D32F2F" />
								<Text style={styles.btnExcluirText}>Remover</Text>
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
							<Text style={styles.modalTitle}>{modoEdicao ? 'Editar Instituição' : 'Nova Casa Espírita'}</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)}>
								<Ionicons name="close" size={28} color="#333" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>

							<Text style={styles.sectionHeader}>Dados da Casa</Text>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Nome da Instituição</Text>
								<TextInput style={styles.modalInput} value={nomeCasa} onChangeText={setNomeCasa} placeholder="Ex: Casa do Caminho" />
							</View>

							<View style={styles.row}>
								<View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
									<Text style={styles.inputLabel}>CNPJ</Text>
									<TextInput style={styles.modalInput} value={cnpj} onChangeText={setCnpj} placeholder="00.000.000/0001-00" keyboardType="numeric" />
								</View>
								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>Cidade / UF</Text>
									<TextInput style={styles.modalInput} value={cidade} onChangeText={setCidade} placeholder="Mossoró - RN" />
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Chave PIX para Doações</Text>
								<TextInput style={styles.modalInput} value={chavePix} onChangeText={setChavePix} placeholder="CNPJ, E-mail ou Telefone" />
							</View>

							<Text style={[styles.sectionHeader, { marginTop: 15 }]}>Acesso do Administrador da Casa</Text>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>E-mail de Login do Resp.</Text>
								<TextInput style={styles.modalInput} value={emailAdmin} onChangeText={setEmailAdmin} keyboardType="email-address" placeholder="admin@casadocaminho.org" autoCapitalize="none" />
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Senha Inicial</Text>
								<TextInput style={styles.modalInput} value={senhaInicial} onChangeText={setSenhaInicial} secureTextEntry={true} placeholder="••••••••" />
							</View>

							<TouchableOpacity style={styles.modalSaveBtn} onPress={handleSalvar}>
								<Text style={styles.modalSaveBtnText}>{modoEdicao ? 'Salvar Alterações' : 'Cadastrar e Liberar Login'}</Text>
							</TouchableOpacity>

							<View style={{ height: 30 }} />
						</ScrollView>
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

	searchSection: { backgroundColor: '#FFF', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
	searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', paddingHorizontal: 15, height: 48, borderRadius: 12 },
	searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },

	content: { flex: 1, padding: 20 },
	resultsCount: { fontSize: 13, color: '#95A5A6', marginBottom: 15, fontWeight: '600' },

	card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
	cardHeader: { flexDirection: 'row', alignItems: 'center' },
	iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EBF4FC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	cardHeaderInfo: { flex: 1 },
	casaTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
	casaCidade: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
	badgeAtivo: { backgroundColor: '#C8E6C9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
	badgeText: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32' },

	divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 12 },
	detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
	detailsText: { fontSize: 13, color: '#546E7A', marginLeft: 8 },
	boldText: { fontWeight: 'bold', color: '#2C3E50' },

	actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
	btnEditar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF4FC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
	btnEditarText: { color: COR_PRIMARIA, fontSize: 13, fontWeight: 'bold', marginLeft: 5 },
	btnExcluir: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
	btnExcluirText: { color: '#D32F2F', fontSize: 13, fontWeight: 'bold', marginLeft: 5 },

	fab: {
		position: 'absolute', bottom: 25, right: 25,
		backgroundColor: COR_DETALHE, width: 60, height: 60, borderRadius: 30,
		justifyContent: 'center', alignItems: 'center', elevation: 10,
	},

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },
	sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },

	row: { flexDirection: 'row' },
	inputGroup: { marginBottom: 14 },
	inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 },
	modalInput: { backgroundColor: '#F4F6F8', height: 48, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },

	modalSaveBtn: { backgroundColor: COR_PRIMARIA, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
	modalSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});