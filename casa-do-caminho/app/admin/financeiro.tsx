import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
	Platform, Alert, Modal, ActivityIndicator, StatusBar, KeyboardAvoidingView, FlatList
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import { useNavigation, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MenuLateral from '@/components/MenuLateral';

import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_RECEITA = '#28a745';
const COR_DESPESA = '#ED1C24';

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

const formatarMoeda = (valor: number) => {
	return `R$ ${valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
};

const formatarDataBR = (dataEUA: string) => {
	if (!dataEUA) return '';
	const p = dataEUA.split('-');
	if (p.length !== 3) return dataEUA;
	return `${p[2]}/${p[1]}/${p[0]}`;
};

const formatarParaEnvio = (valorString: string | number) => {
	const apenasNumeros = String(valorString).replace(/\D/g, '');
	if (!apenasNumeros) return '0.00';
	return (Number(apenasNumeros) / 100).toFixed(2);
};

export default function FinanceiroScreen() {
	const navigation = useNavigation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [codigoCasa, setCodigoCasa] = useState('');

	const [abaAtiva, setAbaAtiva] = useState<'Receita' | 'Despesa'>('Receita');
	const [movimentos, setMovimentos] = useState<any[]>([]);
	const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
	const [planoContas, setPlanoContas] = useState<any[]>([]);
	const [entidadesDb, setEntidadesDb] = useState<any[]>([]);

	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
	const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

	const [modalNovaConta, setModalNovaConta] = useState(false);
	const [formConta, setFormConta] = useState({ tipo: 'Receita', envolvido: '', categoria: '', descricao: '', valor_total: '', data_vencimento: '' });

	const [jaPago, setJaPago] = useState(false);
	const [formContaPagamento, setFormContaPagamento] = useState({ id_forma_pagamento: '', data_pagamento: '' });
	const [dropdownFormasNovaConta, setDropdownFormasNovaConta] = useState(false);

	const [modalBaixa, setModalBaixa] = useState(false);
	const [movimentoSelecionado, setMovimentoSelecionado] = useState<any>(null);
	const [formBaixa, setFormBaixa] = useState({ valor_pago: '', data_pagamento: '', id_forma_pagamento: '' });

	const [dropdownFormasAberto, setDropdownFormasAberto] = useState(false);
	const [dropdownPlanosAberto, setDropdownPlanosAberto] = useState(false);

	const [dropdownEntidadesAberto, setDropdownEntidadesAberto] = useState(false);
	const [buscaEntidade, setBuscaEntidade] = useState('');

	const [modalNovoPlano, setModalNovoPlano] = useState(false);
	const [formPlano, setFormPlano] = useState({ descricao: '', tipo: 'Despesa' });

	const carregarDados = async () => {
		setIsLoading(true);
		try {
			const session = await AsyncStorage.getItem('@user_session');
			let codigo = '';
			let nivel = '';
			if (session) {
				const user = JSON.parse(session);
				codigo = user.codigo_casa || '';
				nivel = user.nivel_acesso || '';
				setCodigoCasa(codigo);
			}

			const resMov = await apiService.api.get(`api_listar_movimentos.php?codigo_casa=${codigo}&nivel=${nivel}&mes=${mesFiltro}&ano=${anoFiltro}`);
			const dataMov = parseJSONSeguro(resMov.data);
			if (dataMov && dataMov.success) setMovimentos(dataMov.data);

			const resFormas = await apiService.api.get(`api_listar_formas_pagamento.php`);
			const dataFormas = parseJSONSeguro(resFormas.data);
			if (dataFormas && dataFormas.success) setFormasPagamento(dataFormas.data);

			const resPlanos = await apiService.api.get(`api_listar_plano_contas.php`);
			const dataPlanos = parseJSONSeguro(resPlanos.data);
			if (dataPlanos && dataPlanos.success) setPlanoContas(dataPlanos.data);

			const resEnt = await apiService.api.get(`api_listar_entidades.php?codigo_casa=${codigo}`);
			const dataEnt = parseJSONSeguro(resEnt.data);
			if (dataEnt && dataEnt.success) setEntidadesDb(dataEnt.data);

		} catch (error) {
			Alert.alert("Erro", "Falha de conexão ao carregar o financeiro.");
		} finally {
			setIsLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			carregarDados();
		}, [mesFiltro, anoFiltro])
	);

	const handleSalvarConta = async () => {
		if (!formConta.envolvido || !formConta.descricao || !formConta.valor_total || !formConta.data_vencimento || !formConta.categoria) {
			Alert.alert("Atenção", "Preencha o Pagador/Beneficiário, Plano de contas, Descrição, Valor e Vencimento.");
			return;
		}
		if (jaPago && (!formContaPagamento.id_forma_pagamento || !formContaPagamento.data_pagamento)) {
			Alert.alert("Atenção", "Preencha a forma e a data de pagamento.");
			return;
		}

		setIsSaving(true);
		try {
			const payload = {
				...formConta,
				codigo_casa: codigoCasa,
				valor_total: formatarParaEnvio(formConta.valor_total),
				ja_pago: jaPago,
				id_forma_pagamento: formContaPagamento.id_forma_pagamento,
				data_pagamento: formContaPagamento.data_pagamento
			};

			const response = await apiService.api.post('api_salvar_movimento.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				setModalNovaConta(false);
				carregarDados();
				setTimeout(() => Alert.alert("Sucesso", resData.message), 400);
			} else {
				Alert.alert("Erro ao Gravar Conta", resData?.message || `Falha.`);
			}
		} catch (e) {
			Alert.alert("Erro", "Falha de comunicação.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleSalvarPlanoConta = async () => {
		if (!formPlano.descricao) {
			Alert.alert("Atenção", "Digite a descrição do plano de contas.");
			return;
		}
		setIsSaving(true);
		try {
			const response = await apiService.api.post('api_salvar_plano_conta.php', formPlano);
			const resData = parseJSONSeguro(response.data);
			if (resData && resData.success) {
				setModalNovoPlano(false);
				setFormConta({ ...formConta, categoria: formPlano.descricao });
				carregarDados();
				setTimeout(() => Alert.alert("Sucesso", resData.message), 400);
			} else {
				Alert.alert("Erro", resData?.message || "Falha ao gravar plano.");
			}
		} catch (e) {
			Alert.alert("Erro", "Falha de comunicação.");
		} finally {
			setIsSaving(false);
		}
	};

	const abrirModalBaixa = (movimento: any) => {
		const restante = movimento.valor_total - movimento.total_pago;
		setMovimentoSelecionado(movimento);
		setDropdownFormasAberto(false);

		const dia = String(new Date().getDate()).padStart(2, '0');
		const mes = String(new Date().getMonth() + 1).padStart(2, '0');
		const ano = new Date().getFullYear();

		setFormBaixa({
			valor_pago: (restante * 100).toFixed(0),
			data_pagamento: `${dia}/${mes}/${ano}`,
			id_forma_pagamento: formasPagamento.length > 0 ? String(formasPagamento[0].value) : ''
		});
		setModalBaixa(true);
	};

	const handleSalvarBaixa = async () => {
		if (!formBaixa.valor_pago || !formBaixa.data_pagamento || !formBaixa.id_forma_pagamento) {
			Alert.alert("Atenção", "Preencha todos os campos do pagamento.");
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				...formBaixa,
				id_movimento: movimentoSelecionado.id,
				valor_pago: formatarParaEnvio(formBaixa.valor_pago)
			};
			const response = await apiService.api.post('api_salvar_baixa.php', payload);
			const resData = parseJSONSeguro(response.data);
			if (resData && resData.success) {
				setModalBaixa(false);
				carregarDados();
				setTimeout(() => Alert.alert("Sucesso", resData.message), 400);
			} else {
				Alert.alert("Erro", resData?.message || "Falha ao registar pagamento.");
			}
		} catch (e) {
			Alert.alert("Erro", "Falha de comunicação.");
		} finally {
			setIsSaving(false);
		}
	};

	const getFormaLabel = (id: string) => {
		const f = formasPagamento.find(x => String(x.value) === id);
		return f ? f.label : 'Selecione a forma...';
	};

	const movimentosFiltrados = movimentos.filter(m => m.tipo_movimento === abaAtiva);
	const totalAba = movimentosFiltrados.reduce((acc, curr) => acc + curr.valor_total, 0);
	const totalPagoAba = movimentosFiltrados.reduce((acc, curr) => acc + curr.total_pago, 0);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />
			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Financeiro</Text>
				<TouchableOpacity style={styles.menuButton} onPress={carregarDados}>
					<Ionicons name="refresh" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<View style={styles.monthNav}>
				<TouchableOpacity onPress={() => { if (mesFiltro === 1) { setMesFiltro(12); setAnoFiltro(anoFiltro - 1); } else setMesFiltro(mesFiltro - 1); }}>
					<Feather name="chevron-left" size={28} color={COR_PRIMARIA} />
				</TouchableOpacity>
				<Text style={styles.monthText}>{String(mesFiltro).padStart(2, '0')} / {anoFiltro}</Text>
				<TouchableOpacity onPress={() => { if (mesFiltro === 12) { setMesFiltro(1); setAnoFiltro(anoFiltro + 1); } else setMesFiltro(mesFiltro + 1); }}>
					<Feather name="chevron-right" size={28} color={COR_PRIMARIA} />
				</TouchableOpacity>
			</View>

			<View style={styles.tabsContainer}>
				<TouchableOpacity style={[styles.tab, abaAtiva === 'Receita' && styles.tabActive, abaAtiva === 'Receita' && { borderBottomColor: COR_RECEITA }]} onPress={() => setAbaAtiva('Receita')}>
					<Feather name="arrow-up-circle" size={18} color={abaAtiva === 'Receita' ? COR_RECEITA : '#888'} />
					<Text style={[styles.tabText, abaAtiva === 'Receita' && { color: COR_RECEITA, fontWeight: 'bold' }]}>Receitas</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.tab, abaAtiva === 'Despesa' && styles.tabActive, abaAtiva === 'Despesa' && { borderBottomColor: COR_DESPESA }]} onPress={() => setAbaAtiva('Despesa')}>
					<Feather name="arrow-down-circle" size={18} color={abaAtiva === 'Despesa' ? COR_DESPESA : '#888'} />
					<Text style={[styles.tabText, abaAtiva === 'Despesa' && { color: COR_DESPESA, fontWeight: 'bold' }]}>Despesas</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.resumoContainer}>
				<View style={styles.resumoBox}>
					<Text style={styles.resumoLabel}>Total Previsto</Text>
					<Text style={styles.resumoValor}>{formatarMoeda(totalAba)}</Text>
				</View>
				<View style={styles.resumoBox}>
					<Text style={styles.resumoLabel}>Total Realizado</Text>
					<Text style={[styles.resumoValor, { color: abaAtiva === 'Receita' ? COR_RECEITA : COR_DESPESA }]}>
						{formatarMoeda(totalPagoAba)}
					</Text>
				</View>
			</View>

			<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>
				{isLoading ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 40 }} />
				) : movimentosFiltrados.length === 0 ? (
					<Text style={{ textAlign: 'center', color: '#666', marginTop: 30 }}>Nenhum registo encontrado neste mês.</Text>
				) : (
					movimentosFiltrados.map((item) => {
						const progresso = (item.total_pago / item.valor_total) * 100;
						const isPago = item.situacao_calculada === 'Pago';

						return (
							<View key={item.id} style={styles.card}>
								<View style={styles.cardHeader}>
									<Text style={styles.cardCat}>{item.categoria}</Text>
									<View style={[styles.badge, { backgroundColor: isPago ? '#d4edda' : item.situacao_calculada === 'Parcial' ? '#fff3cd' : '#f8d7da' }]}>
										<Text style={[styles.badgeText, { color: isPago ? '#155724' : item.situacao_calculada === 'Parcial' ? '#856404' : '#721c24' }]}>
											{item.situacao_calculada}
										</Text>
									</View>
								</View>

								{item.envolvido_exibicao ? (
									<View style={styles.nomeDestaqueRow}>
										<View style={styles.iconePessoa}>
											<Feather name={abaAtiva === 'Receita' ? "arrow-up-right" : "arrow-down-left"} size={14} color={COR_PRIMARIA} />
										</View>
										<View>
											<Text style={{ fontSize: 10, color: '#888', fontWeight: 'bold' }}>
												{abaAtiva === 'Receita' ? 'PAGADOR' : 'BENEFICIÁRIO'}
											</Text>
											<Text style={styles.nomeDestaqueText}>{item.envolvido_exibicao}</Text>
										</View>
									</View>
								) : null}

								<Text style={styles.cardDesc}>
									<Text style={{ fontWeight: 'normal', color: '#666' }}>Ref: </Text>
									{item.descricao}
								</Text>

								<View style={styles.cardValoresRow}>
									<View>
										<Text style={styles.labelMuda}>Valor da Conta</Text>
										<Text style={styles.valorPrincipal}>{formatarMoeda(item.valor_total)}</Text>
									</View>
									<View style={{ alignItems: 'flex-end' }}>
										<Text style={styles.labelMuda}>Vencimento</Text>
										<Text style={styles.dataPrincipal}>{formatarDataBR(item.data_vencimento)}</Text>
									</View>
								</View>

								<View style={styles.progressContainer}>
									<View style={styles.progressBarBg}>
										<View style={[styles.progressBarFill, { width: `${progresso}%`, backgroundColor: abaAtiva === 'Receita' ? COR_RECEITA : COR_DESPESA }]} />
									</View>
									<Text style={styles.progressText}>{formatarMoeda(item.total_pago)} pago de {formatarMoeda(item.valor_total)}</Text>
								</View>

								{item.baixas && item.baixas.length > 0 && (
									<View style={styles.baixasGrid}>
										<Text style={styles.baixasTitle}>Histórico de Pagamentos:</Text>
										{item.baixas.map((b: any) => (
											<View key={b.id} style={styles.baixaRow}>
												<View style={{ flexDirection: 'row', alignItems: 'center' }}>
													<Feather name="corner-down-right" size={14} color="#888" />
													<Text style={styles.baixaText}>{formatarDataBR(b.data_pagamento)} - {b.nome_forma}</Text>
												</View>
												<Text style={styles.baixaValor}>{formatarMoeda(b.valor_pago)}</Text>
											</View>
										))}
									</View>
								)}

								{!isPago && (
									<View style={styles.cardActions}>
										<TouchableOpacity style={styles.btnCardAction} onPress={() => abrirModalBaixa(item)}>
											<Feather name="check-circle" size={18} color="#28a745" />
											<Text style={[styles.btnCardActionText, { color: '#28a745' }]}>Pagar / Baixar</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						)
					})
				)}
				<View style={{ height: 60 }} />
			</ScrollView>

			<TouchableOpacity style={styles.fabBtn} onPress={() => {
				const dia = String(new Date().getDate()).padStart(2, '0');
				const mes = String(new Date().getMonth() + 1).padStart(2, '0');
				const ano = new Date().getFullYear();

				setFormConta({ tipo: abaAtiva, envolvido: '', categoria: '', descricao: '', valor_total: '', data_vencimento: '' });
				setJaPago(false);
				setFormContaPagamento({
					id_forma_pagamento: formasPagamento.length > 0 ? String(formasPagamento[0].value) : '',
					data_pagamento: `${dia}/${mes}/${ano}`
				});
				setDropdownPlanosAberto(false);
				setDropdownEntidadesAberto(false);
				setModalNovaConta(true);
			}}>
				<Feather name="plus" size={28} color="#FFF" />
			</TouchableOpacity>

			<Modal visible={modalNovaConta} transparent animationType="slide">
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContentBottom}>
							<View style={styles.modalHeaderBottom}>
								<Text style={styles.headerTitleModal}>Novo Lançamento</Text>
								<TouchableOpacity onPress={() => setModalNovaConta(false)}><Feather name="x" size={26} color="#555" /></TouchableOpacity>
							</View>
							<ScrollView contentContainerStyle={{ padding: 20 }}>
								<View style={styles.typeSelector}>
									<TouchableOpacity style={[styles.typeOption, formConta.tipo === 'Receita' && styles.typeOptionGreen]} onPress={() => setFormConta({ ...formConta, tipo: 'Receita', categoria: '', envolvido: '' })}>
										<Feather name="arrow-up-circle" size={18} color={formConta.tipo === 'Receita' ? '#FFF' : '#546E7A'} />
										<Text style={[styles.typeOptionText, formConta.tipo === 'Receita' && styles.typeOptionTextActive]}>Receita</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.typeOption, formConta.tipo === 'Despesa' && styles.typeOptionRed]} onPress={() => setFormConta({ ...formConta, tipo: 'Despesa', categoria: '', envolvido: '' })}>
										<Feather name="arrow-down-circle" size={18} color={formConta.tipo === 'Despesa' ? '#FFF' : '#546E7A'} />
										<Text style={[styles.typeOptionText, formConta.tipo === 'Despesa' && styles.typeOptionTextActive]}>Despesa</Text>
									</TouchableOpacity>
								</View>

								<Text style={styles.label}>{formConta.tipo === 'Receita' ? 'Pagador (Quem está a pagar)' : 'Beneficiário (Quem vai receber)'}</Text>
								<View style={[styles.row, { marginBottom: 15 }]}>
									<TouchableOpacity style={[styles.pickerWrapper, { flex: 1, marginRight: 10, marginBottom: 0 }]} onPress={() => { setDropdownEntidadesAberto(!dropdownEntidadesAberto); setDropdownPlanosAberto(false); }}>
										<Text style={{ color: formConta.envolvido ? '#000' : '#888' }} numberOfLines={1}>{formConta.envolvido || 'Selecione ou digite...'}</Text>
										<Feather name={dropdownEntidadesAberto ? "chevron-up" : "chevron-down"} size={20} color="#000" />
									</TouchableOpacity>

									<TouchableOpacity style={[styles.btnAddPlano, { backgroundColor: '#007bff' }]} onPress={() => { setModalNovaConta(false); router.push('/admin/entidades'); }}>
										<Feather name="users" size={20} color="#FFF" />
									</TouchableOpacity>
								</View>

								{dropdownEntidadesAberto && (
									<View style={styles.inlineDropdown}>
										<TextInput
											style={[styles.input, { margin: 10, marginBottom: 0, height: 40, paddingVertical: 5 }]}
											placeholder="Pesquisar..."
											value={buscaEntidade}
											onChangeText={setBuscaEntidade}
										/>
										<ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
											{entidadesDb.filter(e =>
												(formConta.tipo === 'Receita' ? (e.tipo === 'Pagador' || e.tipo === 'Ambos') : (e.tipo === 'Beneficiário' || e.tipo === 'Ambos')) &&
												e.nome.toLowerCase().includes(buscaEntidade.toLowerCase())
											).map((item, idx) => (
												<TouchableOpacity key={idx} style={styles.inlineDropdownItem} onPress={() => { setFormConta({ ...formConta, envolvido: item.nome }); setDropdownEntidadesAberto(false); setBuscaEntidade(''); }}>
													<Text style={styles.inlineDropdownText}>{item.nome}</Text>
												</TouchableOpacity>
											))}
											{entidadesDb.filter(e => (formConta.tipo === 'Receita' ? (e.tipo === 'Pagador' || e.tipo === 'Ambos') : (e.tipo === 'Beneficiário' || e.tipo === 'Ambos')) && e.nome.toLowerCase().includes(buscaEntidade.toLowerCase())).length === 0 && (
												<Text style={{ padding: 15, color: '#888' }}>Nenhuma entidade encontrada.</Text>
											)}
										</ScrollView>
									</View>
								)}

								<Text style={styles.label}>Plano de Contas</Text>
								<View style={[styles.row, { marginBottom: 15 }]}>
									<TouchableOpacity style={[styles.pickerWrapper, { flex: 1, marginRight: 10, marginBottom: 0 }]} onPress={() => { setDropdownPlanosAberto(!dropdownPlanosAberto); setDropdownEntidadesAberto(false); }}>
										<Text style={{ color: formConta.categoria ? '#000' : '#888' }}>{formConta.categoria || 'Selecione...'}</Text>
										<Feather name={dropdownPlanosAberto ? "chevron-up" : "chevron-down"} size={20} color="#000" />
									</TouchableOpacity>

									<TouchableOpacity style={styles.btnAddPlano} onPress={() => { setFormPlano({ descricao: '', tipo: formConta.tipo }); setModalNovoPlano(true); }}>
										<Feather name="plus" size={20} color="#FFF" />
									</TouchableOpacity>
								</View>

								{dropdownPlanosAberto && (
									<View style={styles.inlineDropdown}>
										<ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
											{planoContas.filter(p => p.tipo === formConta.tipo).map((item, idx) => (
												<TouchableOpacity key={idx} style={styles.inlineDropdownItem} onPress={() => { setFormConta({ ...formConta, categoria: item.label }); setDropdownPlanosAberto(false); }}>
													<Text style={styles.inlineDropdownText}>{item.label}</Text>
												</TouchableOpacity>
											))}
											{planoContas.filter(p => p.tipo === formConta.tipo).length === 0 && (
												<Text style={{ padding: 15, color: '#888' }}>Nenhum plano cadastrado.</Text>
											)}
										</ScrollView>
									</View>
								)}

								<Text style={styles.label}>Descrição do Lançamento</Text>
								<TextInput style={styles.input} placeholder="Ex: Pagamento referente a..." value={formConta.descricao} onChangeText={t => setFormConta({ ...formConta, descricao: t })} />

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>Valor Total</Text>
										<MaskedTextInput type="currency" options={{ prefix: 'R$ ', decimalSeparator: ',', groupSeparator: '.', precision: 2 }} style={styles.input} keyboardType="numeric" value={formConta.valor_total ? String(formConta.valor_total).replace(/\D/g, '') : ''} onChangeText={t => setFormConta({ ...formConta, valor_total: t })} />
									</View>
									<View style={{ flex: 1, marginLeft: 5 }}>
										<Text style={styles.label}>Vencimento</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={formConta.data_vencimento} onChangeText={t => setFormConta({ ...formConta, data_vencimento: t })} />
									</View>
								</View>

								<TouchableOpacity style={styles.checkboxRow} onPress={() => setJaPago(!jaPago)}>
									<Feather name={jaPago ? "check-square" : "square"} size={22} color={COR_PRIMARIA} />
									<Text style={styles.checkboxLabel}>Informar Pagamento</Text>
								</TouchableOpacity>

								{jaPago && (
									<View style={[styles.boxPagamentoImediato, { backgroundColor: formConta.tipo === 'Receita' ? '#E8F5E9' : '#FFEBEE', borderColor: formConta.tipo === 'Receita' ? '#C8E6C9' : '#FFCDD2' }]}>
										<Text style={styles.label}>Forma de Pagamento</Text>
										<TouchableOpacity style={styles.pickerWrapper} onPress={() => setDropdownFormasNovaConta(!dropdownFormasNovaConta)}>
											<Text style={{ color: formContaPagamento.id_forma_pagamento ? '#000' : '#888' }}>{getFormaLabel(formContaPagamento.id_forma_pagamento)}</Text>
											<Feather name={dropdownFormasNovaConta ? "chevron-up" : "chevron-down"} size={20} color="#000" />
										</TouchableOpacity>

										{dropdownFormasNovaConta && (
											<View style={styles.inlineDropdown}>
												<ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
													{formasPagamento.map(item => (
														<TouchableOpacity key={item.value} style={styles.inlineDropdownItem} onPress={() => { setFormContaPagamento({ ...formContaPagamento, id_forma_pagamento: String(item.value) }); setDropdownFormasNovaConta(false); }}>
															<Text style={styles.inlineDropdownText}>{item.label}</Text>
														</TouchableOpacity>
													))}
												</ScrollView>
											</View>
										)}

										<Text style={styles.label}>Data do Pagamento</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={formContaPagamento.data_pagamento} onChangeText={t => setFormContaPagamento({ ...formContaPagamento, data_pagamento: t })} />
									</View>
								)}

								<TouchableOpacity style={styles.btnSalvarFull} onPress={handleSalvarConta} disabled={isSaving}>
									{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarFullText}>Gravar Conta</Text>}
								</TouchableOpacity>
							</ScrollView>

							{modalNovoPlano && (
								<View style={styles.pseudoModalOverlay}>
									<View style={styles.modalContent}>
										<View style={styles.modalHeader}>
											<Text style={styles.modalTitle}>Novo Plano de Conta</Text>
											<TouchableOpacity onPress={() => setModalNovoPlano(false)}><Feather name="x" size={24} color="#555" /></TouchableOpacity>
										</View>

										<Text style={styles.label}>Tipo de Plano</Text>
										<TextInput style={[styles.input, { backgroundColor: '#e9ecef', color: '#666' }]} value={formPlano.tipo} editable={false} />

										<Text style={styles.label}>Descrição do Plano</Text>
										<TextInput style={styles.input} placeholder="Ex: Manutenção, Internet..." value={formPlano.descricao} onChangeText={t => setFormPlano({ ...formPlano, descricao: t })} autoFocus={true} />

										<TouchableOpacity style={styles.btnSalvarFull} onPress={handleSalvarPlanoConta} disabled={isSaving}>
											{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarFullText}>Salvar Plano</Text>}
										</TouchableOpacity>
									</View>
								</View>
							)}

						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			<Modal visible={modalBaixa} transparent animationType="slide">
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<View style={styles.modalOverlayBottom}>
						<View style={styles.modalContentBottom}>
							<View style={styles.modalHeaderBottom}>
								<Text style={styles.headerTitleModal}>Registar Pagamento</Text>
								<TouchableOpacity onPress={() => setModalBaixa(false)}><Feather name="x" size={26} color="#555" /></TouchableOpacity>
							</View>
							<View style={{ padding: 20 }}>
								<Text style={[styles.cardDesc, { textAlign: 'center', marginBottom: 20 }]}>{movimentoSelecionado?.descricao}</Text>

								<Text style={styles.label}>Forma de Pagamento</Text>
								<TouchableOpacity style={styles.pickerWrapper} onPress={() => setDropdownFormasAberto(!dropdownFormasAberto)}>
									<Text style={{ color: formBaixa.id_forma_pagamento ? '#000' : '#888' }}>{getFormaLabel(formBaixa.id_forma_pagamento)}</Text>
									<Feather name={dropdownFormasAberto ? "chevron-up" : "chevron-down"} size={20} color="#000" />
								</TouchableOpacity>

								{dropdownFormasAberto && (
									<View style={styles.inlineDropdown}>
										<ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
											{formasPagamento.map(item => (
												<TouchableOpacity key={item.value} style={styles.inlineDropdownItem} onPress={() => { setFormBaixa({ ...formBaixa, id_forma_pagamento: String(item.value) }); setDropdownFormasAberto(false); }}>
													<Text style={styles.inlineDropdownText}>{item.label}</Text>
												</TouchableOpacity>
											))}
										</ScrollView>
									</View>
								)}

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>Valor Pago</Text>
										<MaskedTextInput type="currency" options={{ prefix: 'R$ ', decimalSeparator: ',', groupSeparator: '.', precision: 2 }} style={styles.input} keyboardType="numeric" value={formBaixa.valor_pago ? String(formBaixa.valor_pago).replace(/\D/g, '') : ''} onChangeText={t => setFormBaixa({ ...formBaixa, valor_pago: t })} />
									</View>
									<View style={{ flex: 1, marginLeft: 5 }}>
										<Text style={styles.label}>Data do Pagamento</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={formBaixa.data_pagamento} onChangeText={t => setFormBaixa({ ...formBaixa, data_pagamento: t })} />
									</View>
								</View>

								<TouchableOpacity style={styles.btnSalvarFull} onPress={handleSalvarBaixa} disabled={isSaving}>
									{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarFullText}>Confirmar Pagamento</Text>}
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			<MenuLateral isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	scrollContent: { flex: 1 },
	headerBar: { height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20), paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight, backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, elevation: 5, zIndex: 10 },
	menuButton: { padding: 10 },
	headerBarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

	monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
	monthText: { fontSize: 18, fontWeight: 'bold', color: '#333' },

	tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
	tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: 'transparent' },
	tabActive: { backgroundColor: '#f9f9f9' },
	tabText: { fontSize: 15, marginLeft: 8, color: '#888' },

	resumoContainer: { flexDirection: 'row', padding: 15, justifyContent: 'space-between' },
	resumoBox: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 1, borderWidth: 1, borderColor: '#eee', marginHorizontal: 5, alignItems: 'center' },
	resumoLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
	resumoValor: { fontSize: 16, fontWeight: 'bold', color: '#333' },

	card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
	cardCat: { fontSize: 12, fontWeight: 'bold', color: '#888', textTransform: 'uppercase' },
	badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
	badgeText: { fontSize: 11, fontWeight: 'bold' },

	nomeDestaqueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#F8F9FA', paddingRight: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#eee' },
	iconePessoa: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginRight: 8 },
	nomeDestaqueText: { fontSize: 14, fontWeight: 'bold', color: COR_PRIMARIA, marginTop: 2 },

	cardDesc: { fontSize: 14, color: '#555', marginBottom: 15 },
	cardValoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
	labelMuda: { fontSize: 11, color: '#888', marginBottom: 2 },
	valorPrincipal: { fontSize: 20, fontWeight: 'bold', color: COR_PRIMARIA },
	dataPrincipal: { fontSize: 15, fontWeight: 'bold', color: '#555' },

	progressContainer: { marginBottom: 15 },
	progressBarBg: { height: 8, backgroundColor: '#e9ecef', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
	progressBarFill: { height: '100%', borderRadius: 4 },
	progressText: { fontSize: 11, color: '#666', textAlign: 'right' },

	baixasGrid: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
	baixasTitle: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 6 },
	baixaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
	baixaText: { fontSize: 12, color: '#555', marginLeft: 6 },
	baixaValor: { fontSize: 13, fontWeight: 'bold', color: '#28a745' },

	cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
	btnCardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
	btnCardActionText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },

	fabBtn: { position: 'absolute', bottom: 30, right: 20, backgroundColor: COR_PRIMARIA, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },

	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#000', marginBottom: 15 },
	row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

	pickerWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15, paddingHorizontal: 15, minHeight: 48 },
	btnAddPlano: { backgroundColor: '#28a745', width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 1 },

	checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingVertical: 10 },
	checkboxLabel: { marginLeft: 10, fontSize: 15, fontWeight: 'bold', color: '#333' },
	boxPagamentoImediato: { padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1 },

	inlineDropdown: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: -10, marginBottom: 15, elevation: 2 },
	inlineDropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	inlineDropdownText: { fontSize: 14, color: '#333' },

	btnSalvarFull: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

	typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
	typeOption: { flex: 1, height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: '#E0E0E0', gap: 6 },
	typeOptionGreen: { backgroundColor: '#28a745', borderColor: '#28a745' },
	typeOptionRed: { backgroundColor: '#ED1C24', borderColor: '#ED1C24' },
	typeOptionText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
	typeOptionTextActive: { color: '#FFF', fontWeight: 'bold' },

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' },

	pseudoModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 9999, elevation: 10 },
	modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
	modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
});