import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaskedTextInput } from 'react-native-mask-text';
import { router } from 'expo-router';
import { apiService } from '../src/services/apiService';

const COR_PRIMARIA = '#1B2669';
const COR_FUNDO = '#F4F6F8';

type Instituicao = {
	id: number;
	codigo: string;
	nome: string;
};

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;
	const texto = String(resposta || '').trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const i = texto.indexOf('{');
		const f = texto.lastIndexOf('}');
		if (i !== -1 && f !== -1) return JSON.parse(texto.substring(i, f + 1));
	} catch (e) { }
	return null;
};

export default function PrimeiroAcessoScreen() {
	const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
	const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
	const [modalInstituicao, setModalInstituicao] = useState(false);
	const [buscaInstituicao, setBuscaInstituicao] = useState('');
	const [isLoadingInstituicoes, setIsLoadingInstituicoes] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [form, setForm] = useState({
		nome: '',
		cpf: '',
		nascimento: '',
		nacionalidade: '',
		profissao: '',
		estadoCivil: '',
		naturalidade: '',
		telefone1: '',
		telefone2: '',
		email: '',
		tipoEndereco: 'Principal',
		tipoLogradouro: '',
		cep: '',
		endereco: '',
		numero: '',
		complemento: '',
		bairro: '',
		cidade: '',
	});

	useEffect(() => {
		carregarInstituicoes();
	}, []);

	const carregarInstituicoes = async () => {
		setIsLoadingInstituicoes(true);
		try {
			const response = await apiService.api.get('api_listar_instituicoes_login.php');
			const dados = parseJSONSeguro(response.data);
			if (dados?.success && Array.isArray(dados.data)) {
				setInstituicoes(dados.data.map((item: any) => ({
					id: Number(item.id || 0),
					codigo: String(item.codigo || '').trim(),
					nome: String(item.nome || '').trim(),
				})));
			} else {
				setInstituicoes([]);
			}
		} catch (error) {
			console.log('[PRIMEIRO ACESSO] Erro ao carregar instituições:', error);
			setInstituicoes([]);
		} finally {
			setIsLoadingInstituicoes(false);
		}
	};

	const instituicoesFiltradas = useMemo(() => {
		const busca = buscaInstituicao.trim().toLowerCase();
		if (!busca) return instituicoes;
		return instituicoes.filter(item =>
			item.nome.toLowerCase().includes(busca) || item.codigo.toLowerCase().includes(busca)
		);
	}, [instituicoes, buscaInstituicao]);

	const buscarCep = async () => {
		const cep = form.cep.replace(/\D/g, '');
		if (cep.length !== 8) return;

		try {
			const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
			const data = await response.json();
			if (!data?.erro) {
				setForm(prev => ({
					...prev,
					endereco: data.logradouro || prev.endereco,
					bairro: data.bairro || prev.bairro,
					cidade: data.localidade || prev.cidade,
				}));
			}
		} catch (error) {
			console.log('[PRIMEIRO ACESSO] Falha ao consultar CEP:', error);
		}
	};

	const enviarSolicitacao = async () => {
		const cpf = form.cpf.replace(/\D/g, '');

		if (!instituicao) {
			Alert.alert('Atenção', 'Escolha a instituição que você frequenta.');
			return;
		}

		if (!form.nome.trim() || cpf.length !== 11) {
			Alert.alert('Atenção', 'Informe seu nome completo e um CPF válido.');
			return;
		}

		const telefone1 = form.telefone1.replace(/\D/g, '');

		if (telefone1.length < 10) {
			Alert.alert('Atenção', 'Informe o Telefone 1 para continuar.');
			return;
		}

		setIsSaving(true);
		try {
			const payload = {
				codigo_casa: instituicao.codigo,
				nome: form.nome.trim(),
				cpf,
				nascimento: form.nascimento,
				nacionalidade: form.nacionalidade,
				profissao: form.profissao,
				estado_civil: form.estadoCivil,
				naturalidade: form.naturalidade,
				telefone1: form.telefone1,
				telefone2: form.telefone2,
				email: form.email,
				tipo_endereco: form.tipoEndereco,
				tipo_logradouro: form.tipoLogradouro,
				cep: form.cep,
				endereco: form.endereco,
				numero: form.numero,
				complemento: form.complemento,
				bairro: form.bairro,
				cidade: form.cidade,
			};

			const response = await apiService.api.post('api_solicitar_primeiro_acesso.php', payload);
			const dados = parseJSONSeguro(response.data);

			if (dados?.success) {
				Alert.alert(
					'Solicitação enviada',
					'Seu cadastro foi enviado para aprovação da instituição. O acesso será liberado após a análise.',
					[{ text: 'Entendido', onPress: () => router.replace('/') }]
				);
			} else {
				Alert.alert('Não foi possível solicitar', dados?.message || 'Verifique os dados e tente novamente.');
			}
		} catch (error: any) {
			console.log('[PRIMEIRO ACESSO] Erro ao enviar:', error?.response?.data || error?.message || error);
			Alert.alert('Erro', 'Não foi possível comunicar com o servidor.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.header}>
				<TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Solicitar Primeiro Acesso</Text>
				<View style={styles.headerButton} />
			</View>

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
					<View style={styles.infoBox}>
						<Ionicons name="information-circle-outline" size={24} color={COR_PRIMARIA} />
						<Text style={styles.infoText}>
							Preencha seus dados. O acesso só será liberado após a aprovação da diretoria da instituição escolhida.
						</Text>
					</View>

					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Instituição</Text>
						<Text style={styles.label}>Instituição que você frequenta *</Text>
						<TouchableOpacity style={styles.selector} onPress={() => setModalInstituicao(true)}>
							<View style={{ flex: 1 }}>
								<Text style={[styles.selectorText, !instituicao && { color: '#999', fontWeight: '400' }]}>
									{instituicao?.nome || 'Selecione sua instituição'}
								</Text>
								{!!instituicao && <Text style={styles.selectorSub}>Código: {instituicao.codigo}</Text>}
							</View>
							<Feather name="chevron-down" size={20} color={COR_PRIMARIA} />
						</TouchableOpacity>
					</View>

					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Dados Pessoais</Text>
						<Text style={styles.label}>Nome completo *</Text>
						<TextInput style={styles.input} value={form.nome} onChangeText={nome => setForm({ ...form, nome })} />

						<Text style={styles.label}>CPF *</Text>
						<MaskedTextInput
							mask="999.999.999-99"
							style={styles.input}
							keyboardType="numeric"
							value={form.cpf}
							onChangeText={(texto, raw) => setForm({ ...form, cpf: raw || texto })}
						/>

						<Text style={styles.label}>Nascimento</Text>
						<MaskedTextInput mask="99/99/9999" style={styles.input} keyboardType="numeric" value={form.nascimento} onChangeText={nascimento => setForm({ ...form, nascimento })} />

						<Text style={styles.label}>Nacionalidade</Text>
						<TextInput style={styles.input} value={form.nacionalidade} onChangeText={nacionalidade => setForm({ ...form, nacionalidade })} />

						<Text style={styles.label}>Profissão</Text>
						<TextInput style={styles.input} value={form.profissao} onChangeText={profissao => setForm({ ...form, profissao })} />

						<Text style={styles.label}>Estado civil</Text>
						<TextInput style={styles.input} value={form.estadoCivil} onChangeText={estadoCivil => setForm({ ...form, estadoCivil })} placeholder="Ex.: Solteiro(a)" />

						<Text style={styles.label}>Naturalidade</Text>
						<TextInput style={styles.input} value={form.naturalidade} onChangeText={naturalidade => setForm({ ...form, naturalidade })} placeholder="Cidade de nascimento" />
					</View>

					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Contato</Text>
						<Text style={styles.label}>Telefone 1 *</Text>
						<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="phone-pad" value={form.telefone1} onChangeText={(texto, raw) => setForm({ ...form, telefone1: raw || texto })} />

						<Text style={styles.label}>Telefone 2</Text>
						<MaskedTextInput mask="(99) 99999-9999" style={styles.input} keyboardType="phone-pad" value={form.telefone2} onChangeText={(texto, raw) => setForm({ ...form, telefone2: raw || texto })} />

						<Text style={styles.label}>E-mail</Text>
						<TextInput style={styles.input} value={form.email} onChangeText={email => setForm({ ...form, email })} keyboardType="email-address" autoCapitalize="none" />
					</View>

					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Endereço Principal</Text>
						<Text style={styles.label}>CEP</Text>
						<MaskedTextInput mask="99999-999" style={styles.input} keyboardType="numeric" value={form.cep} onChangeText={cep => setForm({ ...form, cep })} onBlur={buscarCep} />

						<Text style={styles.label}>Tipo de logradouro</Text>
						<TextInput style={styles.input} value={form.tipoLogradouro} onChangeText={tipoLogradouro => setForm({ ...form, tipoLogradouro })} placeholder="Rua, Avenida, Travessa..." />

						<Text style={styles.label}>Endereço</Text>
						<TextInput style={styles.input} value={form.endereco} onChangeText={endereco => setForm({ ...form, endereco })} />

						<View style={styles.row}>
							<View style={{ flex: 1, marginRight: 5 }}>
								<Text style={styles.label}>Número</Text>
								<TextInput style={styles.input} value={form.numero} onChangeText={numero => setForm({ ...form, numero })} />
							</View>
							<View style={{ flex: 2, marginLeft: 5 }}>
								<Text style={styles.label}>Complemento</Text>
								<TextInput style={styles.input} value={form.complemento} onChangeText={complemento => setForm({ ...form, complemento })} />
							</View>
						</View>

						<Text style={styles.label}>Bairro</Text>
						<TextInput style={styles.input} value={form.bairro} onChangeText={bairro => setForm({ ...form, bairro })} />

						<Text style={styles.label}>Cidade</Text>
						<TextInput style={styles.input} value={form.cidade} onChangeText={cidade => setForm({ ...form, cidade })} />
					</View>

					<TouchableOpacity style={[styles.submitButton, isSaving && { opacity: 0.6 }]} onPress={enviarSolicitacao} disabled={isSaving}>
						{isSaving ? <ActivityIndicator color="#FFF" /> : (
							<>
								<Ionicons name="send-outline" size={20} color="#FFF" />
								<Text style={styles.submitText}>ENVIAR SOLICITAÇÃO</Text>
							</>
						)}
					</TouchableOpacity>
					<View style={{ height: 30 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={modalInstituicao} transparent animationType="fade" onRequestClose={() => setModalInstituicao(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Escolha sua Instituição</Text>
							<TouchableOpacity onPress={() => setModalInstituicao(false)}><Feather name="x" size={24} color="#555" /></TouchableOpacity>
						</View>

						<View style={styles.searchBox}>
							<Feather name="search" size={18} color="#777" />
							<TextInput style={styles.searchInput} value={buscaInstituicao} onChangeText={setBuscaInstituicao} placeholder="Nome ou código" autoFocus />
						</View>

						{isLoadingInstituicoes ? <ActivityIndicator size="large" color={COR_PRIMARIA} style={{ marginTop: 30 }} /> : (
							<FlatList
								data={instituicoesFiltradas}
								keyExtractor={item => String(item.id || item.codigo)}
								keyboardShouldPersistTaps="handled"
								renderItem={({ item }) => (
									<TouchableOpacity style={styles.institutionItem} onPress={() => { setInstituicao(item); setModalInstituicao(false); setBuscaInstituicao(''); }}>
										<View style={{ flex: 1 }}>
											<Text style={styles.institutionName}>{item.nome}</Text>
											<Text style={styles.institutionCode}>Código: {item.codigo}</Text>
										</View>
										<Feather name="chevron-right" size={20} color="#AAA" />
									</TouchableOpacity>
								)}
							/>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	header: { height: Platform.OS === 'ios' ? 90 : 60 + (StatusBar.currentHeight || 20), paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight, backgroundColor: COR_PRIMARIA, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
	headerButton: { width: 44, padding: 10 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
	scrollContent: { padding: 16 },
	infoBox: { backgroundColor: '#EAF0FF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, borderWidth: 1, borderColor: '#CFD9F7' },
	infoText: { flex: 1, marginLeft: 10, color: '#34405F', lineHeight: 20, fontSize: 13 },
	card: { backgroundColor: '#FFF', padding: 16, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E3E6EA' },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA, marginBottom: 14 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6 },
	input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 14, minHeight: 48, fontSize: 14, color: '#222', marginBottom: 14 },
	selector: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
	selectorText: { fontSize: 14, color: '#222', fontWeight: '600' },
	selectorSub: { fontSize: 11, color: '#777', marginTop: 2 },
	row: { flexDirection: 'row' },
	submitButton: { minHeight: 56, backgroundColor: '#28A745', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
	submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
	modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
	modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
	searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10 },
	searchInput: { flex: 1, height: 46, paddingHorizontal: 10, color: '#222' },
	institutionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
	institutionName: { fontSize: 15, fontWeight: '600', color: '#333' },
	institutionCode: { fontSize: 12, color: '#777', marginTop: 3 },
});
