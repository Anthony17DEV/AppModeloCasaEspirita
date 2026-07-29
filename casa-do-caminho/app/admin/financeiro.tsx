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

export default function AdminFinanceiroScreen() {
	const [abaAtiva, setAbaAtiva] = useState<'TODOS' | 'RECEBER' | 'PAGAR'>('TODOS');
	const [busca, setBusca] = useState('');

	const [modalVisivel, setModalVisivel] = useState(false);
	const [modoEdicao, setModoEdicao] = useState(false);
	const [itemEditandoId, setItemEditandoId] = useState<number | null>(null);

	const [formTipo, setFormTipo] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
	const [formDescricao, setFormDescricao] = useState('');
	const [formValor, setFormValor] = useState('');
	const [formCategoria, setFormCategoria] = useState('Doação');
	const [formDataVencimento, setFormDataVencimento] = useState('');
	const [formStatus, setFormStatus] = useState<'Pago' | 'Pendente'>('Pendente');

	const [lancamentos, setLancamentos] = useState([
		{ id: 1, tipo: 'RECEBER', descricao: 'Doações Mensais de Associados', valor: 1250.00, categoria: 'Mensalidade', vencimento: '10/08/2026', status: 'Pago' },
		{ id: 2, tipo: 'PAGAR', descricao: 'Conta de Energia (Neoenergia)', valor: 380.50, categoria: 'Manutenção', vencimento: '15/08/2026', status: 'Pendente' },
		{ id: 3, tipo: 'RECEBER', descricao: 'Bazar Beneficente', valor: 890.00, categoria: 'Evento', vencimento: '20/08/2026', status: 'Pago' },
		{ id: 4, tipo: 'PAGAR', descricao: 'Compra de Cestas Básicas', valor: 600.00, categoria: 'Ação Social', vencimento: '25/08/2026', status: 'Pendente' },
	]);

	const totalReceber = lancamentos.filter(i => i.tipo === 'RECEBER').reduce((acc, curr) => acc + curr.valor, 0);
	const totalPagar = lancamentos.filter(i => i.tipo === 'PAGAR').reduce((acc, curr) => acc + curr.valor, 0);
	const saldoPrevisto = totalReceber - totalPagar;

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
		if (!formDescricao || !formValor || !formDataVencimento) {
			Alert.alert("Erro", "Preencha a descrição, o valor e a data de vencimento.");
			return;
		}

		const valorNum = parseFloat(formValor.replace(',', '.'));
		if (isNaN(valorNum)) {
			Alert.alert("Erro", "Insira um valor numérico válido.");
			return;
		}

		if (modoEdicao && itemEditandoId) {
			setLancamentos(prev => prev.map(l =>
				l.id === itemEditandoId
					? { ...l, tipo: formTipo, descricao: formDescricao, valor: valorNum, categoria: formCategoria, vencimento: formDataVencimento, status: formStatus }
					: l
			));
			Alert.alert("Sucesso", "Lançamento atualizado!");
		} else {
			const novoId = Math.floor(Math.random() * 10000);
			setLancamentos([
				{ id: novoId, tipo: formTipo, descricao: formDescricao, valor: valorNum, categoria: formCategoria, vencimento: formDataVencimento, status: formStatus },
				...lancamentos
			]);
			Alert.alert("Sucesso", "Novo lançamento registrado!");
		}
		setModalVisivel(false);
	};

	const handleAlternarStatus = (id: number) => {
		setLancamentos(prev => prev.map(l => {
			if (l.id === id) {
				const novoStatus = l.status === 'Pago' ? 'Pendente' : 'Pago';
				return { ...l, status: novoStatus };
			}
			return l;
		}));
	};

	const handleExcluir = (id: number, descricao: string) => {
		Alert.alert("Excluir Lançamento", `Deseja excluir "${descricao}" do sistema financeiro?`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Sim, Excluir", style: "destructive", onPress: () => {
					setLancamentos(prev => prev.filter(l => l.id !== id));
				}
			}
		]);
	};

	const lancamentosFiltrados = lancamentos.filter(l => {
		const matchAba = abaAtiva === 'TODOS' ? true : l.tipo === abaAtiva;
		const matchBusca = l.descricao.toLowerCase().includes(busca.toLowerCase()) || l.categoria.toLowerCase().includes(busca.toLowerCase());
		return matchAba && matchBusca;
	});

	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Tesouraria / Financeiro</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={styles.summaryContainer}>
					<View style={[styles.summaryCard, styles.cardSaldo]}>
						<Text style={styles.summaryLabel}>Saldo Previsto</Text>
						<Text style={[styles.summaryValue, { color: saldoPrevisto >= 0 ? '#2E7D32' : '#D32F2F' }]}>
							R$ {saldoPrevisto.toFixed(2).replace('.', ',')}
						</Text>
					</View>

					<View style={styles.rowSummary}>
						<View style={[styles.summaryCard, styles.cardEntrada]}>
							<View style={styles.summaryIconRow}>
								<Ionicons name="arrow-down-circle" size={20} color="#2E7D32" />
								<Text style={styles.summarySubLabel}>Entradas</Text>
							</View>
							<Text style={styles.summarySubValue}>R$ {totalReceber.toFixed(2).replace('.', ',')}</Text>
						</View>

						<View style={[styles.summaryCard, styles.cardSaida]}>
							<View style={styles.summaryIconRow}>
								<Ionicons name="arrow-up-circle" size={20} color="#D32F2F" />
								<Text style={styles.summarySubLabel}>Saídas</Text>
							</View>
							<Text style={styles.summarySubValue}>R$ {totalPagar.toFixed(2).replace('.', ',')}</Text>
						</View>
					</View>
				</View>

				<View style={styles.filterSection}>
					<View style={styles.searchBar}>
						<Ionicons name="search" size={20} color="#95A5A6" />
						<TextInput
							style={styles.searchInput}
							placeholder="Buscar por descrição ou categoria..."
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
									{tab === 'TODOS' ? 'Todos' : tab === 'RECEBER' ? 'A Receber' : 'A Pagar'}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				<Text style={styles.listTitle}>Lançamentos ({lancamentosFiltrados.length})</Text>

				{lancamentosFiltrados.map(item => (
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
									{item.status === 'Pago' ? (item.tipo === 'RECEBER' ? 'Recebido' : 'Pago') : 'Pendente (Toque p/ alterar)'}
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
							<Text style={styles.modalTitle}>{modoEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}</Text>
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
								<TextInput style={styles.modalInput} value={formDescricao} onChangeText={setFormDescricao} placeholder="Ex: Doação em dinheiro ou Conta de Luz" />
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

	content: { flex: 1, padding: 20 },

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

	filterSection: { marginBottom: 15 },
	searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 15, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 },
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
		backgroundColor: COR_DETALHE, width: 60, height: 60, borderRadius: 30,
		justifyContent: 'center', alignItems: 'center', elevation: 10,
	},

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },

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