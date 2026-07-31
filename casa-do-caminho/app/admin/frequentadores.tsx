import React, { useState, useCallback } from 'react';
import {
	StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
	Platform, Alert, Modal, ActivityIndicator, Image, StatusBar, FlatList
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MenuLateral from '@/components/MenuLateral';

import { apiService } from '../../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';

export default function FrequentadoresScreen() {
	const navigation = useNavigation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const [filtro, setFiltro] = useState({
		codigo: '', nome: '', cpf: '', cidade: '', instituicao: '', situacao: ''
	});
	const [modalFiltroAtivo, setModalFiltroAtivo] = useState<'situacao' | 'instituicao' | null>(null);

	const [frequentadores, setFrequentadores] = useState<any[]>([]);
	const [instituicoesDb, setInstituicoesDb] = useState<{ label: string, value: string }[]>([]);
	const [isLoadingList, setIsLoadingList] = useState(false);

	const [modalVisivel, setModalVisivel] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [modalFormAtivo, setModalFormAtivo] = useState<{ campo: string, index?: number } | null>(null);

	const [form, setForm] = useState({
		instituicao: '', nome: '', cpf: '', nascimento: '', nacionalidade: '',
		profissao: '', estadoCivil: '', naturalidade: '', rg: '', expedicao: '',
		orgao: '', telefone1: '', telefone2: '', email: '', tipo: ''
	});

	const [enderecos, setEnderecos] = useState([
		{ id: Date.now(), tipo: '', logradouro_tipo: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '' }
	]);
	const [fotos, setFotos] = useState<string[]>([]);

	const carregarDados = async () => {
		setIsLoadingList(true);
		try {
			const resFreq = await apiService.api.get('api_listar_frequentadores.php');
			if (resFreq.data && resFreq.data.success) {
				setFrequentadores(resFreq.data.data);
			}

			const resInst = await apiService.api.get('api_listar_instituicoes.php');
			if (resInst.data && resInst.data.success) {
				const mapped = resInst.data.data.map((i: any) => ({
					label: i.nome,
					value: i.nome
				}));
				setInstituicoesDb(mapped);
			}
		} catch (error) {
			Alert.alert("Erro", "Falha na comunicação com o servidor.");
		} finally {
			setIsLoadingList(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			navigation.setOptions({ headerShown: false });
			carregarDados();
		}, [navigation])
	);

	const abrirModalInserir = () => {
		setForm({
			instituicao: '', nome: '', cpf: '', nascimento: '', nacionalidade: '',
			profissao: '', estadoCivil: '', naturalidade: '', rg: '', expedicao: '',
			orgao: '', telefone1: '', telefone2: '', email: '', tipo: ''
		});
		setEnderecos([{ id: Date.now(), tipo: '', logradouro_tipo: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '' }]);
		setFotos([]);
		setModalVisivel(true);
	};

	const abrirGaleria = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsMultipleSelection: true,
			quality: 0.3,
			base64: true
		});
		if (!result.canceled) {
			const novasFotos = result.assets.filter(a => a.base64).map(a => `data:image/jpeg;base64,${a.base64}`);
			setFotos([...fotos, ...novasFotos]);
		}
	};

	const removerFoto = (indexRemover: number) => setFotos(fotos.filter((_, index) => index !== indexRemover));

	const handleGravar = async () => {
		if (!form.nome || !form.cpf) {
			Alert.alert('Atenção', 'O Nome e CPF são obrigatórios.');
			return;
		}
		setIsSaving(true);
		try {
			const payload = {
				form: form,
				enderecos: enderecos
			};
			const response = await apiService.api.post('api_salvar_frequentador.php', payload);

			if (response.data && response.data.success) {
				Alert.alert("Sucesso!", "Frequentador cadastrado com sucesso!");
				setModalVisivel(false);
				carregarDados();
			} else {
				Alert.alert("Erro ao gravar", response.data?.message || "Erro desconhecido na API.");
			}
		} catch (error) {
			Alert.alert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleImprimir = () => {
		Alert.alert("Imprimir", "Gerando relatório PDF...");
	};

	const opcoesSituacao = [
		{ label: 'Todas', value: '' },
		{ label: 'Ativo', value: 'Ativo' },
		{ label: 'Inativo', value: 'Inativo' }
	];

	const opcoesTipo = [
		{ label: 'FREQUENTADOR', value: 'FREQUENTADOR' },
		{ label: 'ASSOCIADO', value: 'ASSOCIADO' },
		{ label: 'VOLUNTÁRIO', value: 'VOLUNTÁRIO' }
	];

	const opcoesEstadoCivil = [
		{ label: 'Solteiro(a)', value: 'Solteiro(a)' },
		{ label: 'Casado(a)', value: 'Casado(a)' },
		{ label: 'Divorciado(a)', value: 'Divorciado(a)' },
		{ label: 'Viúvo(a)', value: 'Viúvo(a)' },
		{ label: 'União Estável', value: 'União Estável' }
	];

	const opcoesTipoEndereco = [
		{ label: 'Principal', value: 'Principal' },
		{ label: 'Residencial', value: 'Residencial' },
		{ label: 'Comercial', value: 'Comercial' }
	];

	const opcoesLogradouro = [
		{ label: 'Rua', value: 'Rua' },
		{ label: 'Avenida', value: 'Avenida' },
		{ label: 'Travessa', value: 'Travessa' },
		{ label: 'Praça', value: 'Praça' },
		{ label: 'Rodovia', value: 'Rodovia' }
	];

	const getDadosModalForm = () => {
		if (!modalFormAtivo) return [];
		switch (modalFormAtivo.campo) {
			case 'instituicao': return instituicoesDb;
			case 'tipo': return opcoesTipo;
			case 'estadoCivil': return opcoesEstadoCivil;
			case 'tipoEndereco': return opcoesTipoEndereco;
			case 'logradouro': return opcoesLogradouro;
			default: return [];
		}
	};

	const handleSelecionarOpcaoForm = (valor: string) => {
		if (!modalFormAtivo) return;
		const { campo, index } = modalFormAtivo;

		if (campo === 'instituicao') setForm({ ...form, instituicao: valor });
		else if (campo === 'tipo') setForm({ ...form, tipo: valor });
		else if (campo === 'estadoCivil') setForm({ ...form, estadoCivil: valor });
		else if (campo === 'tipoEndereco' && index !== undefined) {
			const n = [...enderecos]; n[index].tipo = valor; setEnderecos(n);
		}
		else if (campo === 'logradouro' && index !== undefined) {
			const n = [...enderecos]; n[index].logradouro_tipo = valor; setEnderecos(n);
		}
		setModalFormAtivo(null);
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
					<Ionicons name="menu" size={28} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerBarTitle}>Gestão de Frequentadores</Text>
				<TouchableOpacity style={styles.menuButton} onPress={() => Alert.alert('Sair', 'Deseja sair?')}>
					<Feather name="power" size={24} color="#FFF" />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>Filtros de Busca</Text>

					<View style={styles.row}>
						<View style={{ flex: 1, marginRight: 5 }}>
							<Text style={styles.label}>Código</Text>
							<TextInput style={styles.input} value={filtro.codigo} onChangeText={t => setFiltro({ ...filtro, codigo: t })} keyboardType="numeric" />
						</View>
						<View style={{ flex: 3, marginLeft: 5 }}>
							<Text style={styles.label}>Nome</Text>
							<TextInput style={styles.input} value={filtro.nome} onChangeText={t => setFiltro({ ...filtro, nome: t })} />
						</View>
					</View>

					<View style={styles.row}>
						<View style={{ flex: 2, marginRight: 5 }}>
							<Text style={styles.label}>CPF</Text>
							<MaskedTextInput mask="999.999.999-99" style={styles.input} value={filtro.cpf} onChangeText={(_, raw) => setFiltro({ ...filtro, cpf: raw })} keyboardType="numeric" />
						</View>
						<View style={{ flex: 2, marginLeft: 5 }}>
							<Text style={styles.label}>Cidade</Text>
							<TextInput style={styles.input} value={filtro.cidade} onChangeText={t => setFiltro({ ...filtro, cidade: t })} />
						</View>
					</View>

					<View style={styles.row}>
						<View style={{ flex: 2, marginRight: 5 }}>
							<Text style={styles.label}>Instituição</Text>
							<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFiltroAtivo('instituicao')} activeOpacity={0.7}>
								<Text style={{ fontSize: 14, color: filtro.instituicao ? '#000' : '#888', flex: 1 }}>{filtro.instituicao || 'Selecione...'}</Text>
								<Feather name="chevron-down" size={20} color="#000" />
							</TouchableOpacity>
						</View>
						<View style={{ flex: 2, marginLeft: 5 }}>
							<Text style={styles.label}>Situação</Text>
							<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFiltroAtivo('situacao')} activeOpacity={0.7}>
								<Text style={{ fontSize: 14, color: filtro.situacao ? '#000' : '#888', flex: 1 }}>{filtro.situacao || 'Todas'}</Text>
								<Feather name="chevron-down" size={20} color="#000" />
							</TouchableOpacity>
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
						<TouchableOpacity style={[styles.btnAction, { backgroundColor: '#fd7e14' }]} onPress={handleImprimir}>
							<Feather name="printer" size={18} color="#fff" />
							<Text style={styles.btnActionText}>Imprimir</Text>
						</TouchableOpacity>
					</View>
				</View>

				{isLoadingList ? (
					<ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} />
				) : (
					frequentadores.length === 0 ? (
						<Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Nenhum registro encontrado.</Text>
					) : (
						frequentadores.map((item) => (
							<View key={item.id} style={styles.card}>
								<View style={styles.cardContent}>
									<Text style={styles.cardTitle}>{item.codigo} - {item.nome}</Text>
									<Text style={styles.cardSub}>CPF: <Text style={{ fontWeight: 'bold' }}>{item.cpf}</Text></Text>
									<Text style={styles.cardSub}>Cidade: {item.cidade}</Text>
									<Text style={styles.cardSub}>Instituição: {item.instituicao}</Text>
									<Text style={styles.cardSub}>Tipo: <Text style={{ fontWeight: 'bold' }}>{item.tipo}</Text></Text>
									<Text style={styles.cardSub}>Situação: <Text style={{ color: item.situacao === 'Ativo' ? '#28a745' : '#ED1C24', fontWeight: 'bold' }}>{item.situacao}</Text></Text>
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
						))
					)
				)}
			</ScrollView>

			<Modal visible={!!modalFiltroAtivo} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalFiltroAtivo(null)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Selecione uma opção</Text>
							<TouchableOpacity onPress={() => setModalFiltroAtivo(null)} style={{ padding: 5 }}>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={modalFiltroAtivo === 'situacao' ? opcoesSituacao : instituicoesDb}
							keyExtractor={(item, index) => index.toString()}
							renderItem={({ item }) => {
								const isSelected = modalFiltroAtivo === 'situacao' ? filtro.situacao === item.value : filtro.instituicao === item.value;
								return (
									<TouchableOpacity
										style={styles.modalItem}
										onPress={() => {
											if (modalFiltroAtivo === 'situacao') setFiltro({ ...filtro, situacao: item.value });
											if (modalFiltroAtivo === 'instituicao') setFiltro({ ...filtro, instituicao: item.value });
											setModalFiltroAtivo(null);
										}}
									>
										<Text style={[styles.modalItemText, isSelected && { color: COR_PRIMARIA, fontWeight: 'bold' }]}>{item.label}</Text>
										{isSelected && <Feather name="check" size={18} color={COR_PRIMARIA} />}
									</TouchableOpacity>
								)
							}}
						/>
					</View>
				</TouchableOpacity>
			</Modal>

			<Modal visible={modalVisivel} transparent animationType="slide">
				<View style={styles.modalOverlayBottom}>
					<View style={styles.modalContentBottom}>
						<View style={styles.modalHeaderBottom}>
							<Text style={[styles.headerTitleModal, { color: COR_PRIMARIA }]}>Cadastrar Frequentador</Text>
							<TouchableOpacity onPress={() => setModalVisivel(false)} style={{ padding: 5 }}>
								<Feather name="x" size={26} color="#555" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionTitle}>Dados Pessoais (PF)</Text>

								<Text style={styles.label}>Instituição</Text>
								<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'instituicao' })} activeOpacity={0.7}>
									<Text style={{ fontSize: 14, color: form.instituicao ? '#000' : '#888', flex: 1 }}>{form.instituicao || 'Selecione...'}</Text>
									<Feather name="chevron-down" size={20} color="#000" />
								</TouchableOpacity>

								<Text style={styles.label}>Nome</Text>
								<TextInput style={styles.input} value={form.nome} onChangeText={t => setForm({ ...form, nome: t })} />

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>CPF</Text>
										<MaskedTextInput mask="999.999.999-99" style={styles.input} keyboardType="numeric" value={form.cpf} onChangeText={(_, raw) => setForm({ ...form, cpf: raw })} />
									</View>
									<View style={{ flex: 1, marginLeft: 5 }}>
										<Text style={styles.label}>Nascimento</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.nascimento} onChangeText={t => setForm({ ...form, nascimento: t })} />
									</View>
								</View>

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>Nacionalidade</Text>
										<TextInput style={styles.input} value={form.nacionalidade} onChangeText={t => setForm({ ...form, nacionalidade: t })} />
									</View>
									<View style={{ flex: 1, marginLeft: 5 }}>
										<Text style={styles.label}>Profissão</Text>
										<TextInput style={styles.input} value={form.profissao} onChangeText={t => setForm({ ...form, profissao: t })} />
									</View>
								</View>

								<Text style={styles.label}>Estado Civil</Text>
								<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'estadoCivil' })} activeOpacity={0.7}>
									<Text style={{ fontSize: 14, color: form.estadoCivil ? '#000' : '#888', flex: 1 }}>{form.estadoCivil || 'Selecione...'}</Text>
									<Feather name="chevron-down" size={20} color="#000" />
								</TouchableOpacity>

								<Text style={styles.label}>Naturalidade</Text>
								<TextInput style={styles.input} value={form.naturalidade} onChangeText={t => setForm({ ...form, naturalidade: t })} />

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>RG</Text>
										<TextInput style={styles.input} keyboardType="numeric" value={form.rg} onChangeText={t => setForm({ ...form, rg: t })} />
									</View>
									<View style={{ flex: 1, marginLeft: 5 }}>
										<Text style={styles.label}>Expedição</Text>
										<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.expedicao} onChangeText={t => setForm({ ...form, expedicao: t })} />
									</View>
								</View>

								<Text style={styles.label}>Órgão Expeditor</Text>
								<TextInput style={styles.input} value={form.orgao} onChangeText={t => setForm({ ...form, orgao: t })} />

								<View style={styles.row}>
									<View style={{ flex: 1, marginRight: 5 }}>
										<Text style={styles.label}>Telefone 1</Text>
										<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={form.telefone1} onChangeText={(_, raw) => setForm({ ...form, telefone1: raw })} />
									</View>
									<View style={{ flex: 1, marginLeft: 5 }}>
										<Text style={styles.label}>Telefone 2</Text>
										<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="numeric" value={form.telefone2} onChangeText={(_, raw) => setForm({ ...form, telefone2: raw })} />
									</View>
								</View>

								<Text style={styles.label}>E-mail</Text>
								<TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={t => setForm({ ...form, email: t })} />

								<Text style={styles.label}>Tipo de Cadastro</Text>
								<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'tipo' })} activeOpacity={0.7}>
									<Text style={{ fontSize: 14, color: form.tipo ? '#000' : '#888', flex: 1 }}>{form.tipo || 'Selecione...'}</Text>
									<Feather name="chevron-down" size={20} color="#000" />
								</TouchableOpacity>
							</View>

							<View style={styles.sectionContainer}>
								<Text style={styles.sectionTitle}>Endereços</Text>
								{enderecos.map((item, index) => (
									<View key={item.id} style={styles.blocoDinamico}>
										<View style={styles.row}>
											<Text style={styles.label}>Endereço {index + 1}</Text>
											{index > 0 && <TouchableOpacity onPress={() => setEnderecos(enderecos.filter(e => e.id !== item.id))}><Feather name="trash-2" size={18} color="#ED1C24" /></TouchableOpacity>}
										</View>

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Tipo do Endereço</Text>
												<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'tipoEndereco', index })} activeOpacity={0.7}>
													<Text style={{ fontSize: 14, color: item.tipo ? '#000' : '#888', flex: 1 }}>{item.tipo || 'Ex: Residencial'}</Text>
													<Feather name="chevron-down" size={20} color="#000" />
												</TouchableOpacity>
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Logradouro</Text>
												<TouchableOpacity style={styles.pickerWrapper} onPress={() => setModalFormAtivo({ campo: 'logradouro', index })} activeOpacity={0.7}>
													<Text style={{ fontSize: 14, color: item.logradouro_tipo ? '#000' : '#888', flex: 1 }}>{item.logradouro_tipo || 'Ex: Rua, Av'}</Text>
													<Feather name="chevron-down" size={20} color="#000" />
												</TouchableOpacity>
											</View>
										</View>

										<Text style={styles.label}>CEP</Text>
										<MaskedTextInput mask="99999-999" style={styles.input} keyboardType="numeric" value={item.cep} onChangeText={t => { const n = [...enderecos]; n[index].cep = t; setEnderecos(n); }} />

										<Text style={styles.label}>Endereço</Text>
										<TextInput style={styles.input} value={item.endereco} onChangeText={t => { const n = [...enderecos]; n[index].endereco = t; setEnderecos(n); }} />

										<View style={styles.row}>
											<View style={{ flex: 1, marginRight: 5 }}>
												<Text style={styles.label}>Nº</Text>
												<TextInput style={styles.input} value={item.numero} onChangeText={t => { const n = [...enderecos]; n[index].numero = t; setEnderecos(n); }} />
											</View>
											<View style={{ flex: 3, marginLeft: 5 }}>
												<Text style={styles.label}>Complemento</Text>
												<TextInput style={styles.input} value={item.complemento} onChangeText={t => { const n = [...enderecos]; n[index].complemento = t; setEnderecos(n); }} />
											</View>
										</View>

										<View style={styles.row}>
											<View style={{ flex: 2, marginRight: 5 }}>
												<Text style={styles.label}>Bairro</Text>
												<TextInput style={styles.input} value={item.bairro} onChangeText={t => { const n = [...enderecos]; n[index].bairro = t; setEnderecos(n); }} />
											</View>
											<View style={{ flex: 2, marginLeft: 5 }}>
												<Text style={styles.label}>Cidade</Text>
												<TextInput style={styles.input} value={item.cidade} onChangeText={t => { const n = [...enderecos]; n[index].cidade = t; setEnderecos(n); }} />
											</View>
										</View>
									</View>
								))}

								<TouchableOpacity style={styles.btnAddItem} onPress={() => setEnderecos([...enderecos, { id: Date.now(), tipo: '', logradouro_tipo: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '' }])}>
									<Feather name="plus" size={18} color="#28a745" />
									<Text style={styles.btnAddItemText}>Adicionar Endereço</Text>
								</TouchableOpacity>
							</View>

							<View style={styles.sectionContainer}>
								<Text style={styles.sectionTitle}>Fotos e Anexos</Text>
								{fotos.length > 0 && (
									<View style={styles.fotosGrid}>
										{fotos.map((uri, index) => (
											<View key={index} style={styles.fotoThumbContainer}>
												<Image source={{ uri }} style={styles.fotoThumb} />
												<TouchableOpacity style={styles.btnRemoverFoto} onPress={() => removerFoto(index)}>
													<Feather name="x" size={14} color="#fff" />
												</TouchableOpacity>
											</View>
										))}
									</View>
								)}
								<TouchableOpacity style={styles.btnFotoAction} onPress={abrirGaleria}>
									<Feather name="image" size={24} color="#555" />
									<Text style={styles.btnFotoActionText}>Adicionar Foto/Anexo</Text>
								</TouchableOpacity>
							</View>

							<TouchableOpacity style={styles.btnSalvarFull} onPress={handleGravar} disabled={isSaving}>
								{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarFullText}>Gravar</Text>}
							</TouchableOpacity>
							<View style={{ height: 40 }} />
						</ScrollView>
					</View>
				</View>

				{!!modalFormAtivo && (
					<TouchableOpacity style={styles.pseudoModalOverlay} activeOpacity={1} onPress={() => setModalFormAtivo(null)}>
						<View style={styles.modalContent}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Selecione uma opção</Text>
								<TouchableOpacity onPress={() => setModalFormAtivo(null)} style={{ padding: 5 }}>
									<Feather name="x" size={24} color="#555" />
								</TouchableOpacity>
							</View>
							<FlatList
								data={getDadosModalForm()}
								keyExtractor={(item, index) => index.toString()}
								renderItem={({ item }) => (
									<TouchableOpacity style={styles.modalItem} onPress={() => handleSelecionarOpcaoForm(item.value)}>
										<Text style={styles.modalItemText}>{item.label}</Text>
									</TouchableOpacity>
								)}
							/>
						</View>
					</TouchableOpacity>
				)}
			</Modal>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
				isAdmin={true}
			/>
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

	pickerWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9', marginBottom: 15, paddingHorizontal: 15, minHeight: 48 },

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

	fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
	fotoThumbContainer: { position: 'relative', marginRight: 10, marginBottom: 10 },
	fotoThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
	btnRemoverFoto: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ED1C24', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
	btnFotoAction: { backgroundColor: '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
	btnFotoActionText: { marginTop: 8, fontSize: 14, color: '#555', fontWeight: 'bold' },

	btnSalvarFull: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10 },
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
	modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
	modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
	modalItemText: { fontSize: 15, color: '#333' },

	modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContentBottom: { backgroundColor: '#f4f6f8', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
	modalHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
	headerTitleModal: { fontSize: 18, fontWeight: 'bold' },

	pseudoModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 9999 }
});