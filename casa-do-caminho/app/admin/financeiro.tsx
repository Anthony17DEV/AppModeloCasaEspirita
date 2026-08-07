import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, ActivityIndicator, FlatList, StatusBar
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MenuLateral from '@/components/MenuLateral';

import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F4F6F8';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	const texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const i = texto.indexOf('{');
		const f = texto.lastIndexOf('}');
		if (i !== -1 && f !== -1) return JSON.parse(texto.substring(i, f + 1));
	} catch (e) { }
	return { success: false, data: [] };
};

export default function AdminFinanceiroScreen() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const [abaAtiva, setAbaAtiva] = useState<'TODOS' | 'RECEBER' | 'PAGAR'>('TODOS');
	const [busca, setBusca] = useState('');

	const [filtroInstituicao, setFiltroInstituicao] = useState('');
	const [instituicoesDb, setInstituicoesDb] = useState<{ label: string, value: string }[]>([]);
	const [modalInstVisivel, setModalInstVisivel] = useState(false);

	const [lancamentos, setLancamentos] = useState<any[]>([]);

	const [modalVisivel, setModalVisivel] = useState(false);
	const [modoEdicao, setModoEdicao] = useState(false);
	const [itemEditandoId, setItemEditandoId] = useState<number | null>(null);

	const [formTipo, setFormTipo] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
	const [formDescricao, setFormDescricao] = useState('');
	const [formValor, setFormValor] = useState('');
	const [formCategoria, setFormCategoria] = useState('Doação');
	const [formDataVencimento, setFormDataVencimento] = useState('');
	const [formStatus, setFormStatus] = useState<'Pago' | 'Pendente'>('Pendente');

	const carregarDados = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';
			let adminFlag = false;

			if (session) {
				const user = JSON.parse(session);
				setUsuarioLogado(user);
				codigo = user.codigo_casa;
				nivel = user.nivel_acesso;
				adminFlag = (nivel === 'ADMINISTRADOR');
				setIsAdmin(adminFlag);
			} else {
				router.replace('/');
				return;
			}

			const resInst = await apiService.api.get(`api_listar_instituicoes.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataInst = parseJSONSeguro(resInst.data);
			if (resDataInst && resDataInst.success) {
				let lista = resDataInst.data;
				if (!adminFlag && codigo !== '') {
					lista = lista.filter((i: any) => String(i.codigo) === String(codigo));
					if (lista.length > 0) {
						setFiltroInstituicao(String(lista[0].codigo));
					}
				}
				const mapped = lista.map((i: any) => ({ label: i.nome, value: String(i.codigo) }));
				setInstituicoesDb(mapped);
			}

			const resFin = await apiService.api.get(`api_listar_financeiro.php?codigo_casa=${codigo}&nivel=${nivel}`);
			const resDataFin = parseJSONSeguro(resFin.data);
			if (resDataFin && resDataFin.success) {
				setLancamentos(resDataFin.data);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha de comunicação com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			carregarDados();
		}, [])
	);

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

	const lancamentosFiltrados = lancamentos.filter(l => {
		const matchAba = abaAtiva === 'TODOS' ? true : l.tipo === abaAtiva;
		const matchBusca = l.descricao.toLowerCase().includes(busca.toLowerCase()) || l.categoria.toLowerCase().includes(busca.toLowerCase());
		const matchInst = filtroInstituicao ? String(l.codigo_casa) === filtroInstituicao : true;
		return matchAba && matchBusca && matchInst;
	});

	const entradasPagas = lancamentosFiltrados.filter(i => i.tipo === 'RECEBER' && i.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0);
	const saidasPagas = lancamentosFiltrados.filter(i => i.tipo === 'PAGAR' && i.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0);
	const saldoCaixa = entradasPagas - saidasPagas;

	const aReceber = lancamentosFiltrados.filter(i => i.tipo === 'RECEBER' && i.status === 'Pendente').reduce((acc, curr) => acc + curr.valor, 0);
	const aPagar = lancamentosFiltrados.filter(i => i.tipo === 'PAGAR' && i.status === 'Pendente').reduce((acc, curr) => acc + curr.valor, 0);

	const abrirModalCriar = () => {
		setModoEdicao(false);
		setFormTipo('RECEBER'); setFormDescricao(''); setFormValor(''); setFormCategoria('Doação'); setFormDataVencimento(''); setFormStatus('Pendente');
		setModalVisivel(true);
	};

	const abrirModalEditar = (item: any) => {
		setModoEdicao(true);
		setItemEditandoId(item.id);
		setFormTipo(item.tipo);
		setFormDescricao(item.descricao);
		setFormValor(item.valor.toString());
		setFormCategoria(item.categoria);
		setFormDataVencimento(item.vencimento);
		setFormStatus(item.status);
		setModalVisivel(true);
	};

	const handleSalvar = () => {
		Alert.alert("Atenção", "A gravação no backend será conectada na próxima etapa!");
		setModalVisivel(false);
	};

	const handleAlternarStatus = async (id: number) => {
		setLancamentos(prev => prev.map(l => {
			if (l.id === id) {
				return { ...l, status: l.status === 'Pago' ? 'Pendente' : 'Pago' };
			}
			return l;
		}));

		try {
			const res = await apiService.api.get(`api_alternar_status_financeiro.php?id=${id}`);
			const resData = parseJSONSeguro(res.data);

			if (!resData || !resData.success) {
				Alert.alert("Erro", resData?.message || "Falha ao alterar o status.");
				carregarDados();
			}
		} catch (error) {
			Alert.alert("Erro", "Falha de conexão com o servidor.");
			carregarDados();
		}
	};

	const handleExcluir = (id: number, descricao: string) => {
		Alert.alert("Atenção", "A exclusão será conectada no backend no próximo passo!");
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Tesouraria / Financeiro</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => { }}>
					<Feather name="power" size={24} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : (
					<>
						{/* PAINEL DINÂMICO DE SALDOS */}
						<View style={styles.summaryContainer}>
							<View style={[styles.summaryCard, styles.cardSaldo]}>
								<Text style={styles.summaryLabel}>Saldo em Caixa (Realizado)</Text>
								<Text style={[styles.summaryValue, { color: saldoCaixa >= 0 ? '#2E7D32' : '#D32F2F' }]}>
									R$ {saldoCaixa.toFixed(2).replace('.', ',')}
								</Text>
							</View>

							<View style={styles.rowSummary}>
								<View style={[styles.summaryCard, styles.cardEntrada]}>
									<View style={styles.summaryIconRow}>
										<Ionicons name="arrow-down-circle" size={18} color="#2E7D32" />
										<Text style={styles.summarySubLabel}>Recebido</Text>
									</View>
									<Text style={styles.summarySubValue}>R$ {entradasPagas.toFixed(2).replace('.', ',')}</Text>
									<Text style={styles.summaryPendingText}>+ R$ {aReceber.toFixed(2).replace('.', ',')} a receber</Text>
								</View>

								<View style={[styles.summaryCard, styles.cardSaida]}>
									<View style={styles.summaryIconRow}>
										<Ionicons name="arrow-up-circle" size={18} color="#D32F2F" />
										<Text style={styles.summarySubLabel}>Pago</Text>
									</View>
									<Text style={styles.summarySubValue}>R$ {saidasPagas.toFixed(2).replace('.', ',')}</Text>
									<Text style={styles.summaryPendingText}>+ R$ {aPagar.toFixed(2).replace('.', ',')} a pagar</Text>
								</View>
							</View>
						</View>

						<View style={styles.filterSection}>
							<Text style={styles.filterTitle}>Instituição</Text>
							<TouchableOpacity
								style={[styles.pickerWrapper, !isAdmin && { backgroundColor: '#E0E6ED' }]}
								onPress={() => { if (isAdmin) setModalInstVisivel(true); }}
								activeOpacity={0.7}
							>
								<Text style={{ fontSize: 14, color: filtroInstituicao ? '#000' : '#888', flex: 1 }}>
									{instituicoesDb.find(i => i.value === filtroInstituicao)?.label || (isAdmin ? 'Todas as Instituições' : 'Carregando...')}
								</Text>
								{isAdmin && <Feather name="chevron-down" size={20} color="#000" />}
							</TouchableOpacity>

							<Text style={styles.filterTitle}>Buscar Registro</Text>
							<View style={styles.searchBar}>
								<Ionicons name="search" size={20} color="#95A5A6" />
								<TextInput
									style={styles.searchInput}
									placeholder="Buscar frequentador ou descrição..."
									value={busca}
									onChangeText={setBusca}
								/>
							</View>

							<View style={styles.tabRow}>
								{(['TODOS', 'RECEBER', 'PAGAR'] as const).map(tab => (
									<TouchableOpacity
										key={tab}
										style={[styles.tabBtn, abaAtiva === tab && styles.tabBtnActive]}
										onPress={() => setAbaAtiva(tab)}
									>
										<Text style={[styles.tabText, abaAtiva === tab && styles.tabTextActive]}>
											{tab === 'TODOS' ? 'Todos' : tab === 'RECEBER' ? 'Receitas' : 'Despesas'}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						<Text style={styles.listTitle}>Lançamentos ({lancamentosFiltrados.length})</Text>

						{lancamentosFiltrados.length === 0 ? (
							<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Nenhum lançamento encontrado.</Text>
						) : (
							lancamentosFiltrados.map(item => (
								<View key={item.id} style={styles.itemCard}>
									<View style={styles.itemHeader}>
										<View style={[styles.typeIcon, item.tipo === 'RECEBER' ? styles.typeGreen : styles.typeRed]}>
											<Ionicons
												name={item.tipo === 'RECEBER' ? 'arrow-down' : 'arrow-up'}
												size={18}
												color={item.tipo === 'RECEBER' ? '#2E7D32' : '#D32F2F'}
											/>
										</View>

										<View style={styles.itemTextContainer}>
											<Text style={styles.itemTitle}>{item.descricao}</Text>
											<Text style={styles.itemCategory}>{item.categoria} • Vencimento: {item.vencimento}</Text>
										</View>

										<Text style={[styles.itemValue, { color: item.tipo === 'RECEBER' ? '#2E7D32' : '#D32F2F' }]}>
											{item.tipo === 'RECEBER' ? '+' : '-'} R$ {item.valor.toFixed(2).replace('.', ',')}
										</Text>
									</View>

									<View style={styles.itemFooter}>
										<TouchableOpacity
											style={[styles.statusBadge, item.status === 'Pago' ? styles.badgeGreen : styles.badgeYellow]}
											onPress={() => handleAlternarStatus(item.id)}
										>
											<Ionicons
												name={item.status === 'Pago' ? 'checkmark-circle' : 'time-outline'}
												size={14}
												color={item.status === 'Pago' ? '#2E7D32' : '#E65100'}
												style={{ marginRight: 4 }}
											/>
											<Text style={[styles.statusBadgeText, { color: item.status === 'Pago' ? '#2E7D32' : '#E65100' }]}>
												{item.status === 'Pago' ? (item.tipo === 'RECEBER' ? 'Recebido' : 'Pago') : 'Pendente (Toque para pagar)'}
											</Text>
										</TouchableOpacity>

										<View style={styles.actionRow}>
											<TouchableOpacity style={styles.actionBtn} onPress={() => abrirModalEditar(item)}>
												<Ionicons name="create-outline" size={18} color={COR_PRIMARIA} />
											</TouchableOpacity>

											<TouchableOpacity style={styles.actionBtn} onPress={() => handleExcluir(item.id, item.descricao)}>
												<Ionicons name="trash-outline" size={18} color="#D32F2F" />
											</TouchableOpacity>
										</View>
									</View>
								</View>
							))
						)}
					</>
				)}

				<View style={{ height: 100 }} />
			</ScrollView>

			<TouchableOpacity style={styles.fab} onPress={abrirModalCriar} activeOpacity={0.8}>
				<Ionicons name="add" size={32} color="#FFF" />
			</TouchableOpacity>

			<Modal visible={modalInstVisivel} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalInstVisivel(false)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeaderTop}>
							<Text style={styles.modalTitleTop}>Filtrar Instituição</Text>
							<TouchableOpacity onPress={() => setModalInstVisivel(false)} style={{ padding: 5 }}>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={[{ label: 'Todas as Instituições', value: '' }, ...instituicoesDb]}
							keyExtractor={(item, idx) => item.value + idx.toString()}
							renderItem={({ item }) => {
								const isSelected = filtroInstituicao === item.value;
								return (
									<TouchableOpacity
										style={styles.modalItem}
										onPress={() => {
											setFiltroInstituicao(item.value);
											setModalInstVisivel(false);
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

			<Modal visible={modalVisivel} animationType="slide" transparent={true} onRequestClose={() => setModalVisivel(false)}>
				<View style={styles.modalOverlayBottom}>
					<View style={styles.modalContainerBottom}>
						<View style={styles.modalHeaderTop}>
							<Text style={styles.modalTitleTop}>{modoEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)}>
								<Ionicons name="close" size={28} color="#333" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>

							<Text style={styles.inputLabel}>Tipo de Movimentação</Text>
							<View style={styles.typeSelector}>
								<TouchableOpacity
									style={[styles.typeOption, formTipo === 'RECEBER' && styles.typeOptionGreen]}
									onPress={() => setFormTipo('RECEBER')}
								>
									<Ionicons name="arrow-down" size={18} color={formTipo === 'RECEBER' ? '#FFF' : '#2E7D32'} />
									<Text style={[styles.typeOptionText, formTipo === 'RECEBER' && styles.typeOptionTextActive]}>Contas a Receber</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.typeOption, formTipo === 'PAGAR' && styles.typeOptionRed]}
									onPress={() => setFormTipo('PAGAR')}
								>
									<Ionicons name="arrow-up" size={18} color={formTipo === 'PAGAR' ? '#FFF' : '#D32F2F'} />
									<Text style={[styles.typeOptionText, formTipo === 'PAGAR' && styles.typeOptionTextActive]}>Contas a Pagar</Text>
								</TouchableOpacity>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Descrição</Text>
								<TextInput style={styles.modalInput} value={formDescricao} onChangeText={setFormDescricao} placeholder="Ex: Doação ou Conta de Luz" />
							</View>

							<View style={styles.row}>
								<View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
									<Text style={styles.inputLabel}>Valor (R$)</Text>
									<TextInput style={styles.modalInput} value={formValor} onChangeText={setFormValor} placeholder="0,00" keyboardType="numeric" />
								</View>

								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>Vencimento</Text>
									<TextInput style={styles.modalInput} value={formDataVencimento} onChangeText={setFormDataVencimento} placeholder="DD/MM/AAAA" keyboardType="numeric" />
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Categoria</Text>
								<TextInput style={styles.modalInput} value={formCategoria} onChangeText={setFormCategoria} placeholder="Ex: Mensalidade, Evento, Manutenção" />
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Status Inicial</Text>
								<View style={styles.typeSelector}>
									<TouchableOpacity
										style={[styles.typeOption, formStatus === 'Pago' && styles.typeOptionActive]}
										onPress={() => setFormStatus('Pago')}
									>
										<Text style={[styles.typeOptionText, formStatus === 'Pago' && styles.typeOptionTextActive]}>Concluído / Pago</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[styles.typeOption, formStatus === 'Pendente' && styles.typeOptionActive]}
										onPress={() => setFormStatus('Pendente')}
									>
										<Text style={[styles.typeOptionText, formStatus === 'Pendente' && styles.typeOptionTextActive]}>Pendente</Text>
									</TouchableOpacity>
								</View>
							</View>

							<TouchableOpacity style={styles.modalSaveBtn} onPress={handleSalvar}>
								<Text style={styles.modalSaveBtnText}>{modoEdicao ? 'Salvar Alterações' : 'Confirmar Lançamento'}</Text>
							</TouchableOpacity>

							<View style={{ height: 30 }} />
						</ScrollView>
					</View>
				</View>
			</Modal>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
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

	content: { flex: 1, padding: 15 },

	summaryContainer: { marginBottom: 20 },
	summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
	cardSaldo: { marginBottom: 10, alignItems: 'center' },
	summaryLabel: { fontSize: 13, color: '#7F8C8D', fontWeight: 'bold' },
	summaryValue: { fontSize: 26, fontWeight: 'bold', marginTop: 4 },

	rowSummary: { flexDirection: 'row', gap: 10 },
	cardEntrada: { flex: 1 },
	cardSaida: { flex: 1 },
	summaryIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
	summarySubLabel: { fontSize: 12, color: '#7F8C8D', marginLeft: 6, fontWeight: '600' },
	summarySubValue: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
	summaryPendingText: { fontSize: 11, color: '#95A5A6', marginTop: 4, fontWeight: '500' },

	filterSection: { marginBottom: 15, backgroundColor: '#FFF', padding: 15, borderRadius: 12, elevation: 2 },
	filterTitle: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	pickerWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15, paddingHorizontal: 15, minHeight: 45 },
	searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', paddingHorizontal: 15, height: 45, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
	searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
	tabRow: { flexDirection: 'row', gap: 8 },
	tabBtn: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#E0E6ED' },
	tabBtnActive: { backgroundColor: COR_PRIMARIA },
	tabText: { fontSize: 13, color: '#546E7A', fontWeight: '600' },
	tabTextActive: { color: '#FFF', fontWeight: 'bold' },

	listTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
	itemCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
	itemHeader: { flexDirection: 'row', alignItems: 'center' },
	typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	typeGreen: { backgroundColor: '#E8F5E9' },
	typeRed: { backgroundColor: '#FFEBEE' },
	itemTextContainer: { flex: 1 },
	itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
	itemCategory: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
	itemValue: { fontSize: 15, fontWeight: 'bold' },

	itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F2F5' },
	statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
	badgeGreen: { backgroundColor: '#E8F5E9' },
	badgeYellow: { backgroundColor: '#FFF3E0' },
	statusBadgeText: { fontSize: 11, fontWeight: 'bold' },

	actionRow: { flexDirection: 'row', gap: 8 },
	actionBtn: { padding: 6, backgroundColor: '#F0F2F5', borderRadius: 8 },

	fab: {
		position: 'absolute', bottom: 25, right: 25,
		backgroundColor: '#28a745', width: 60, height: 60, borderRadius: 30,
		justifyContent: 'center', alignItems: 'center', elevation: 10,
	},

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
	modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
	modalHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitleTop: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	modalItemText: { fontSize: 15, color: '#333' },

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContainerBottom: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },

	typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
	typeOption: { flex: 1, height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: '#E0E0E0', gap: 6 },
	typeOptionGreen: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
	typeOptionRed: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
	typeOptionActive: { backgroundColor: COR_PRIMARIA, borderColor: COR_PRIMARIA },
	typeOptionText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
	typeOptionTextActive: { color: '#FFF', fontWeight: 'bold' },

	row: { flexDirection: 'row' },
	inputGroup: { marginBottom: 14 },
	inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 },
	modalInput: { backgroundColor: '#F4F6F8', height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },

	modalSaveBtn: { backgroundColor: COR_PRIMARIA, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
	modalSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});