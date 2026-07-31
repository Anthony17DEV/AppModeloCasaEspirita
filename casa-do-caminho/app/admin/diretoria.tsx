import React, { useState } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
	Platform, Alert, Modal, StatusBar
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import { router, useLocalSearchParams } from 'expo-router';
import { apiService } from '../../src/services/apiService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';

export default function DiretoriaScreen() {
	const params = useLocalSearchParams();
	const casaId = params.casaId || '';
	const casaNome = params.casaNome || 'Instituição';

	const [filtro, setFiltro] = useState({ dataInicial: '', dataFinal: '' });

	const [modalVisivel, setModalVisivel] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [diretorias, setDiretorias] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const carregarDiretorias = async () => {
		setIsLoading(true);
		try {
			const response = await apiService.api.get(`api_listar_diretorias.php?casaId=${casaId}`);
			if (response.data && response.data.success) {
				setDiretorias(response.data.data);
			} else {
				Alert.alert("Atenção", response.data?.message || "Erro ao carregar diretorias.");
			}
		} catch (error) {
			Alert.alert("Erro", "Falha na comunicação com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarDiretorias();
		}, [casaId])
	);

	const [form, setForm] = useState({ eleicao: '', inicio: '', fim: '' });

	const [membros, setMembros] = useState([
		{
			id: Date.now(), cargo: '', nome: '', cpf: '', nascimento: '',
			nacionalidade: '', profissao: '', estadoCivil: '', naturalidade: '',
			rg: '', expedicao: '', orgao: '', telefone1: '', telefone2: '', email: ''
		}
	]);

	const abrirModalInserir = () => {
		setForm({ eleicao: '', inicio: '', fim: '' });
		setMembros([{
			id: Date.now(), cargo: '', nome: '', cpf: '', nascimento: '',
			nacionalidade: '', profissao: '', estadoCivil: '', naturalidade: '',
			rg: '', expedicao: '', orgao: '', telefone1: '', telefone2: '', email: ''
		}]);
		setModalVisivel(true);
	};

	const handleGravar = async () => {
		if (!form.eleicao || !form.inicio) {
			Alert.alert('Atenção', 'Data de eleição e início são obrigatórios.');
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				id_instituicao: casaId,
				form: form,
				membros: membros
			};
			const response = await apiService.api.post('api_salvar_diretoria.php', payload);

			if (response.data && response.data.success) {
				Alert.alert("Sucesso!", "Diretoria cadastrada com sucesso!");
				setModalVisivel(false);
				carregarDiretorias();
			} else {
				Alert.alert("Erro ao gravar", response.data?.message || "Erro desconhecido na API.");
			}
		} catch (error) {
			Alert.alert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Diretoria - {casaNome}</Text>
				<View style={{ width: 48 }} />
			</View>

			<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>Filtros de Busca</Text>

					<View style={styles.row}>
						<View style={{ flex: 2, marginRight: 5 }}>
							<Text style={styles.label}>Data Inicial</Text>
							<MaskedTextInput mask="99/99/9999" style={styles.input} value={filtro.dataInicial} onChangeText={t => setFiltro({ ...filtro, dataInicial: t })} keyboardType="numeric" />
						</View>
						<View style={{ flex: 2, marginLeft: 5 }}>
							<Text style={styles.label}>Data Final</Text>
							<MaskedTextInput mask="99/99/9999" style={styles.input} value={filtro.dataFinal} onChangeText={t => setFiltro({ ...filtro, dataFinal: t })} keyboardType="numeric" />
						</View>
					</View>

					<View style={[styles.row, { marginTop: 10, gap: 10 }]}>
						<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#28a745' }]} onPress={abrirModalInserir}>
							<Feather name="plus" size={18} color="#fff" />
							<Text style={styles.btnActionText}>Inserir</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#007bff' }]}>
							<Feather name="search" size={18} color="#fff" />
							<Text style={styles.btnActionText}>Buscar</Text>
						</TouchableOpacity>
					</View>
				</View>

				{diretorias.map((item) => (
					<View key={item.id} style={styles.card}>
						<View style={styles.cardContent}>
							<Text style={styles.cardTitle}>Eleição: {item.eleicao}</Text>
							<Text style={styles.cardSub}>Mandato: <Text style={{ fontWeight: 'bold' }}>{item.inicio} a {item.fim}</Text></Text>
							<Text style={styles.cardSub}>Situação: <Text style={{ color: item.situacao === 'Ativa' ? '#28a745' : '#ED1C24', fontWeight: 'bold' }}>{item.situacao}</Text></Text>
						</View>
						<View style={styles.cardActions}>
							<TouchableOpacity style={styles.btnCardAction} onPress={() => Alert.alert("Editar", "Abrir edição")}>
								<Feather name="edit" size={18} color="#007bff" />
								<Text style={[styles.btnCardActionText, { color: '#007bff' }]}>Editar</Text>
							</TouchableOpacity>
							<View style={styles.divisorVertical} />
							<TouchableOpacity style={styles.btnCardAction} onPress={() => Alert.alert("Excluir", "Deseja excluir?")}>
								<Feather name="trash-2" size={18} color="#ED1C24" />
								<Text style={[styles.btnCardActionText, { color: '#ED1C24' }]}>Excluir</Text>
							</TouchableOpacity>
						</View>
					</View>
				))}
			</ScrollView>

			<Modal visible={modalVisivel} transparent animationType="slide">
				<View style={styles.modalOverlayBottom}>
					<View style={styles.modalContentBottom}>
						<View style={styles.modalHeaderBottom}>
							<Text style={[styles.headerTitleModal, { color: COR_PRIMARIA }]}>Cadastrar Diretoria</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)} style={{ padding: 5 }}>
								<Feather name="x" size={26} color="#555" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionTitle}>Mandato</Text>

								<Text style={styles.label}>Data da Eleição</Text>
								<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.eleicao} onChangeText={t => setForm({ ...form, eleicao: t })} />

								<View style={styles.row}>
									<View style={{ flex: 2, marginRight: 5 }}>
										<Text style={styles.label}>Data Inicial</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.inicio} onChangeText={t => setForm({ ...form, inicio: t })} />
									</View>
									<View style={{ flex: 2, marginLeft: 5 }}>
										<Text style={styles.label}>Data Final</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.fim} onChangeText={t => setForm({ ...form, fim: t })} />
									</View>
								</View>
							</View>

							<View style={styles.sectionContainer}>
								<Text style={styles.sectionTitle}>Membros da Diretoria</Text>
								{membros.map((item, index) => (
									<View key={item.id} style={styles.blocoDinamico}>
										<View style={styles.row}>
											<Text style={styles.label}>Membro {index + 1}</Text>
											{index > 0 && <TouchableOpacity onPress={() => setMembros(membros.filter(e => e.id !== item.id))}><Feather name="trash-2" size={18} color="#ED1C24" /></TouchableOpacity>}
										</View>

										<Text style={styles.label}>Cargo</Text>
										<TextInput style={styles.input} value={item.cargo} onChangeText={t => { const n = [...membros]; n[index].cargo = t; setMembros(n); }} />

										<Text style={styles.label}>Nome</Text>
										<TextInput style={styles.input} value={item.nome} onChangeText={t => { const n = [...membros]; n[index].nome = t; setMembros(n); }} />

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>CPF</Text>
												<MaskedTextInput mask="999.999.999-99" style={styles.input} keyboardType="numeric" value={item.cpf} onChangeText={(_, raw) => { const n = [...membros]; n[index].cpf = raw; setMembros(n); }} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Nascimento</Text>
												<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={item.nascimento} onChangeText={t => { const n = [...membros]; n[index].nascimento = t; setMembros(n); }} />
											</View>
										</View>

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Nacionalidade</Text>
												<TextInput style={styles.input} value={item.nacionalidade} onChangeText={t => { const n = [...membros]; n[index].nacionalidade = t; setMembros(n); }} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Profissão</Text>
												<TextInput style={styles.input} value={item.profissao} onChangeText={t => { const n = [...membros]; n[index].profissao = t; setMembros(n); }} />
											</View>
										</View>

										<Text style={styles.label}>Estado Civil</Text>
										<TextInput style={styles.input} value={item.estadoCivil} onChangeText={t => { const n = [...membros]; n[index].estadoCivil = t; setMembros(n); }} />

										<Text style={styles.label}>Naturalidade</Text>
										<TextInput style={styles.input} value={item.naturalidade} onChangeText={t => { const n = [...membros]; n[index].naturalidade = t; setMembros(n); }} />

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>RG</Text>
												<TextInput style={styles.input} keyboardType="numeric" value={item.rg} onChangeText={t => { const n = [...membros]; n[index].rg = t; setMembros(n); }} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Expedição</Text>
												<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={item.expedicao} onChangeText={t => { const n = [...membros]; n[index].expedicao = t; setMembros(n); }} />
											</View>
										</View>

										<Text style={styles.label}>Órgão Expeditor</Text>
										<TextInput style={styles.input} value={item.orgao} onChangeText={t => { const n = [...membros]; n[index].orgao = t; setMembros(n); }} />

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Telefone 1</Text>
												<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={item.telefone1} onChangeText={(_, raw) => { const n = [...membros]; n[index].telefone1 = raw; setMembros(n); }} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Telefone 2</Text>
												<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={item.telefone2} onChangeText={(_, raw) => { const n = [...membros]; n[index].telefone2 = raw; setMembros(n); }} />
											</View>
										</View>

										<Text style={styles.label}>E-mail</Text>
										<TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={item.email} onChangeText={t => { const n = [...membros]; n[index].email = t; setMembros(n); }} />
									</View>
								))}

								<TouchableOpacity style={styles.btnAddItem} onPress={() => setMembros([...membros, { id: Date.now(), cargo: '', nome: '', cpf: '', nascimento: '', nacionalidade: '', profissao: '', estadoCivil: '', naturalidade: '', rg: '', expedicao: '', orgao: '', telefone1: '', telefone2: '', email: '' }])}>
									<Feather name="plus" size={18} color="#28a745" />
									<Text style={styles.btnAddItemText}>Adicionar Membro</Text>
								</TouchableOpacity>
							</View>

							<TouchableOpacity style={styles.btnSalvarFull} onPress={handleGravar} disabled={isSaving}>
								<Text style={styles.btnSalvarFullText}>{isSaving ? 'Gravando...' : 'Gravar'}</Text>
							</TouchableOpacity>
							<View style={{ height: 40 }} />
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	scrollContent: { flex: 1, backgroundColor: '#f4f6f8' },

	headerBar: {
		height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20),
		paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
		backgroundColor: COR_PRIMARIA,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		elevation: 5,
		zIndex: 10,
	},
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#000', marginBottom: 15 },
	row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

	btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 45, borderRadius: 8 },
	btnActionText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },

	card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
	cardContent: { marginBottom: 10 },
	cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 5 },
	cardSub: { fontSize: 13, color: '#666', marginBottom: 2 },

	cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10 },
	btnCardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
	btnCardActionText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
	divisorVertical: { width: 1, backgroundColor: '#eee', height: '60%' },

	blocoDinamico: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 15 },
	btnAddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#28a745', borderStyle: 'dashed' },
	btnAddItemText: { color: '#28a745', fontWeight: 'bold', marginLeft: 8 },

	btnSalvarFull: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' }
});