import React, { useState, useEffect, useMemo } from 'react';
import {
	StyleSheet,
	Text,
	View,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	Image,
	Alert,
	ActivityIndicator,
	Modal,
	FlatList
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { apiService } from '../src/services/apiService';

const COR_PRINCIPAL = '#1B2669';

type InstituicaoLogin = {
	id: number;
	codigo: string;
	nome: string;
};

type UsuarioSalvo = {
	nome: string;
	cpf: string;
	codigo: string;
	instituicao?: string;
};

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object' && resposta !== null) return resposta;

	let texto = String(resposta).trim();

	try {
		return JSON.parse(texto);
	} catch (e) { }

	try {
		const start = texto.indexOf('{"success"');
		if (start !== -1) {
			const sub = texto.substring(start);
			const end = sub.lastIndexOf('}');

			if (end !== -1) {
				return JSON.parse(sub.substring(0, end + 1));
			}
		}
	} catch (e) { }

	return null;
};

export default function LoginScreen() {
	const [usuarioSalvo, setUsuarioSalvo] = useState<UsuarioSalvo | null>(null);

	const [codigoInstituicao, setCodigoInstituicao] = useState('');
	const [instituicaoSelecionada, setInstituicaoSelecionada] = useState<InstituicaoLogin | null>(null);

	const [instituicoes, setInstituicoes] = useState<InstituicaoLogin[]>([]);
	const [isLoadingInstituicoes, setIsLoadingInstituicoes] = useState(false);
	const [modalInstituicoes, setModalInstituicoes] = useState(false);
	const [buscaInstituicao, setBuscaInstituicao] = useState('');

	const [login, setLogin] = useState('');
	const [senha, setSenha] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [mostrarSenha, setMostrarSenha] = useState(false);

	useEffect(() => {
		const iniciarLogin = async () => {
			await Promise.all([
				carregarUltimoLogin(),
				carregarInstituicoes()
			]);
		};

		iniciarLogin();
	}, []);

	const carregarUltimoLogin = async () => {
		try {
			const saved = await AsyncStorage.getItem('@last_user_login');

			if (!saved) return;

			const parsed: UsuarioSalvo = JSON.parse(saved);

			setUsuarioSalvo(parsed);
			setCodigoInstituicao(parsed.codigo || '');
			setLogin(parsed.cpf || '');
		} catch (error) {
			console.log('Erro ao carregar último login:', error);
		}
	};

	const carregarInstituicoes = async () => {
		setIsLoadingInstituicoes(true);

		try {
			const response = await apiService.api.get('api_listar_instituicoes_login.php');
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				const lista = Array.isArray(resData.data) ? resData.data : [];

				setInstituicoes(
					lista.map((item: any) => ({
						id: Number(item.id || 0),
						codigo: String(item.codigo || '').trim(),
						nome: String(item.nome || '').trim()
					}))
				);
			} else {
				setInstituicoes([]);
			}
		} catch (error) {
			console.log('Erro ao carregar instituições do login:', error);
			setInstituicoes([]);
		} finally {
			setIsLoadingInstituicoes(false);
		}
	};

	const instituicoesFiltradas = useMemo(() => {
		const busca = buscaInstituicao.trim().toLowerCase();

		if (!busca) return instituicoes;

		return instituicoes.filter((item) => {
			const nome = item.nome.toLowerCase();
			const codigo = item.codigo.toLowerCase();

			return nome.includes(busca) || codigo.includes(busca);
		});
	}, [instituicoes, buscaInstituicao]);

	const selecionarInstituicao = (instituicao: InstituicaoLogin) => {
		setInstituicaoSelecionada(instituicao);
		setCodigoInstituicao(instituicao.codigo);
		setBuscaInstituicao('');
		setModalInstituicoes(false);
	};

	const tratarBuscaInstituicao = (texto: string) => {
		setBuscaInstituicao(texto);

		if (texto.trim() === '0000') {
			setInstituicaoSelecionada({
				id: 0,
				codigo: '0000',
				nome: 'Acesso administrativo'
			});

			setCodigoInstituicao('0000');
			setBuscaInstituicao('');
			setModalInstituicoes(false);
		}
	};

	const abrirBuscaInstituicao = () => {
		setBuscaInstituicao('');
		setModalInstituicoes(true);

		if (instituicoes.length === 0 && !isLoadingInstituicoes) {
			carregarInstituicoes();
		}
	};

	const handleLogin = async () => {
		if (!codigoInstituicao || !login || !senha) {
			Alert.alert("Atenção", "Selecione a Instituição e preencha o CPF e a Senha.");
			return;
		}

		setIsLoading(true);

		try {
			const payload = {
				codigo: codigoInstituicao.trim(),
				cpf: login.replace(/\D/g, ''),
				senha: senha
			};

			const response = await apiService.api.post('api_login.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				const userData = resData.user;

				await AsyncStorage.setItem('@user_session', JSON.stringify(userData));

				await AsyncStorage.setItem('@last_user_login', JSON.stringify({
					nome: userData.nome,
					cpf: userData.cpf,
					codigo: userData.codigo_casa,
					instituicao: String(userData.codigo_casa) === '0000'
						? ''
						: (instituicaoSelecionada?.nome || usuarioSalvo?.instituicao || '')
				}));

				if (userData.primeiro_acesso == 1) {
					router.replace('/perfil');
				} else {
					router.replace('/home');
				}
			} else {
				Alert.alert("Erro de Acesso", resData?.message || "Credenciais inválidas.");
			}
		} catch (error) {
			Alert.alert("Erro", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	const limparUsuarioSalvo = () => {
		setUsuarioSalvo(null);
		setInstituicaoSelecionada(null);
		setCodigoInstituicao('');
		setLogin('');
		setSenha('');
		setBuscaInstituicao('');
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}
		>
			<View style={styles.formContainer}>

				<Image
					source={require('@/assets/images/splash.png')}
					style={styles.logo}
					resizeMode="contain"
				/>

				{usuarioSalvo ? (
					<View style={styles.savedUserContainer}>
						<Text style={styles.title}>Bem-vindo de volta!</Text>

						<View style={styles.userCard}>
							<View style={styles.avatarPlaceholder}>
								<Text style={styles.avatarText}>
									{usuarioSalvo.nome ? usuarioSalvo.nome.charAt(0) : ''}
								</Text>
							</View>

							<View style={styles.userInfo}>
								<Text style={styles.userName}>{usuarioSalvo.nome}</Text>

								{!!usuarioSalvo.instituicao && (
									<Text style={styles.userInstitution} numberOfLines={1}>
										{usuarioSalvo.instituicao}
									</Text>
								)}

								<Text style={styles.userLogin}>
									{usuarioSalvo.codigo === '0000'
										? `Acesso administrativo | CPF: ${usuarioSalvo.cpf}`
										: `Casa: ${usuarioSalvo.codigo} | CPF: ${usuarioSalvo.cpf}`
									}
								</Text>
							</View>
						</View>

						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								placeholder="Digite sua senha"
								placeholderTextColor="#999"
								value={senha}
								onChangeText={setSenha}
								secureTextEntry={!mostrarSenha}
								autoCapitalize="none"
								autoCorrect={false}
							/>

							<TouchableOpacity
								style={styles.eyeIcon}
								onPress={() => setMostrarSenha(!mostrarSenha)}
							>
								<Feather
									name={mostrarSenha ? "eye" : "eye-off"}
									size={22}
									color="#999"
								/>
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={[styles.button, { backgroundColor: COR_PRINCIPAL, width: '100%' }]}
							onPress={handleLogin}
							activeOpacity={0.8}
							disabled={isLoading}
						>
							{isLoading
								? <ActivityIndicator color="#FFF" />
								: <Text style={styles.buttonText}>Entrar</Text>
							}
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.switchAccountBtn}
							onPress={limparUsuarioSalvo}
						>
							<Text style={styles.switchAccountText}>Entrar com outra conta</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View>
						<Text style={styles.title}>Acesso</Text>
						<Text style={styles.subtitle}>Preencha seus dados para entrar</Text>

						<Text style={styles.label}>Instituição</Text>

						<TouchableOpacity
							style={styles.institutionSelector}
							onPress={abrirBuscaInstituicao}
							activeOpacity={0.7}
						>
							<View style={styles.institutionSelectorContent}>
								<Text
									style={[
										styles.institutionSelectorText,
										!instituicaoSelecionada && styles.institutionSelectorPlaceholder
									]}
									numberOfLines={1}
								>
									{instituicaoSelecionada
										? instituicaoSelecionada.nome
										: 'Buscar instituição ou código'
									}
								</Text>

								{!!instituicaoSelecionada && instituicaoSelecionada.codigo !== '0000' && (
									<Text style={styles.institutionCode}>
										Código: {instituicaoSelecionada.codigo}
									</Text>
								)}
							</View>

							{isLoadingInstituicoes ? (
								<ActivityIndicator size="small" color={COR_PRINCIPAL} />
							) : (
								<Feather name="search" size={20} color={COR_PRINCIPAL} />
							)}
						</TouchableOpacity>

						<TextInput
							style={styles.input}
							placeholder="Login (CPF)"
							placeholderTextColor="#999"
							value={login}
							onChangeText={setLogin}
							keyboardType="numeric"
							autoCapitalize="none"
							autoCorrect={false}
						/>

						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								placeholder="Senha"
								placeholderTextColor="#999"
								value={senha}
								onChangeText={setSenha}
								secureTextEntry={!mostrarSenha}
								autoCapitalize="none"
								autoCorrect={false}
							/>

							<TouchableOpacity
								style={styles.eyeIcon}
								onPress={() => setMostrarSenha(!mostrarSenha)}
							>
								<Feather
									name={mostrarSenha ? "eye" : "eye-off"}
									size={22}
									color="#999"
								/>
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={[styles.button, { backgroundColor: COR_PRINCIPAL }]}
							onPress={handleLogin}
							activeOpacity={0.8}
							disabled={isLoading}
						>
							{isLoading
								? <ActivityIndicator color="#FFF" />
								: <Text style={styles.buttonText}>Entrar</Text>
							}
						</TouchableOpacity>
					</View>
				)}

				<TouchableOpacity
					style={styles.firstAccessLink}
					onPress={() => router.push('/primeiro-acesso')}
					activeOpacity={0.7}
				>
					<Feather name="user-plus" size={17} color={COR_PRINCIPAL} />
					<Text style={styles.firstAccessLinkText}>Primeiro acesso? Solicite seu cadastro</Text>
				</TouchableOpacity>

			</View>

			<Modal
				visible={modalInstituicoes}
				transparent
				animationType="fade"
				onRequestClose={() => setModalInstituicoes(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<View>
								<Text style={styles.modalTitle}>Selecionar Instituição</Text>
								<Text style={styles.modalSubtitle}>
									Pesquise pelo nome ou pelo código
								</Text>
							</View>

							<TouchableOpacity
								onPress={() => setModalInstituicoes(false)}
								style={styles.modalCloseButton}
							>
								<Feather name="x" size={24} color="#555" />
							</TouchableOpacity>
						</View>

						<View style={styles.searchBox}>
							<Feather name="search" size={19} color="#777" />

							<TextInput
								style={styles.searchInput}
								placeholder="Ex: Casa do Caminho ou 10001"
								placeholderTextColor="#999"
								value={buscaInstituicao}
								onChangeText={tratarBuscaInstituicao}
								autoCapitalize="none"
								autoCorrect={false}
								autoFocus
							/>

							{!!buscaInstituicao && (
								<TouchableOpacity onPress={() => setBuscaInstituicao('')}>
									<Feather name="x-circle" size={18} color="#999" />
								</TouchableOpacity>
							)}
						</View>

						{isLoadingInstituicoes ? (
							<View style={styles.modalLoading}>
								<ActivityIndicator size="large" color={COR_PRINCIPAL} />
								<Text style={styles.modalLoadingText}>Carregando instituições...</Text>
							</View>
						) : (
							<FlatList
								data={instituicoesFiltradas}
								keyExtractor={(item) => String(item.id || item.codigo)}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
								ListEmptyComponent={
									<View style={styles.emptyState}>
										<Feather name="home" size={32} color="#BBB" />
										<Text style={styles.emptyStateText}>
											Nenhuma instituição encontrada.
										</Text>
									</View>
								}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={styles.institutionItem}
										onPress={() => selecionarInstituicao(item)}
										activeOpacity={0.7}
									>
										<View style={styles.institutionItemIcon}>
											<Feather name="home" size={18} color={COR_PRINCIPAL} />
										</View>

										<View style={styles.institutionItemInfo}>
											<Text style={styles.institutionItemName}>
												{item.nome}
											</Text>

											<Text style={styles.institutionItemCode}>
												Código: {item.codigo}
											</Text>
										</View>

										<Feather name="chevron-right" size={20} color="#AAA" />
									</TouchableOpacity>
								)}
							/>
						)}
					</View>
				</View>
			</Modal>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF'
	},

	formContainer: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 32
	},

	logo: {
		width: '80%',
		height: 130,
		alignSelf: 'center',
		marginBottom: 24
	},

	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333333',
		marginBottom: 8,
		textAlign: 'center'
	},

	subtitle: {
		fontSize: 16,
		color: '#666666',
		marginBottom: 32,
		textAlign: 'center'
	},

	label: {
		fontSize: 13,
		fontWeight: 'bold',
		color: '#555',
		marginBottom: 6
	},

	savedUserContainer: {
		alignItems: 'center'
	},

	userCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		padding: 16,
		borderRadius: 12,
		width: '100%',
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0'
	},

	avatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: COR_PRINCIPAL,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16
	},

	avatarText: {
		color: '#FFF',
		fontSize: 20,
		fontWeight: 'bold'
	},

	userInfo: {
		flex: 1
	},

	userName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333'
	},

	userInstitution: {
		fontSize: 13,
		fontWeight: '600',
		color: COR_PRINCIPAL,
		marginTop: 3
	},

	userLogin: {
		fontSize: 13,
		color: '#666',
		marginTop: 4
	},

	switchAccountBtn: {
		padding: 15,
		marginTop: 10
	},

	switchAccountText: {
		color: COR_PRINCIPAL,
		fontSize: 15,
		fontWeight: '600'
	},

	firstAccessLink: {
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 10,
		marginTop: 12,
		gap: 7
	},

	firstAccessLinkText: {
		color: COR_PRINCIPAL,
		fontSize: 14,
		fontWeight: '700'
	},

	input: {
		backgroundColor: '#F5F5F5',
		borderRadius: 8,
		paddingHorizontal: 16,
		height: 52,
		fontSize: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		color: '#333'
	},

	institutionSelector: {
		minHeight: 58,
		backgroundColor: '#F5F5F5',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginBottom: 16,
		flexDirection: 'row',
		alignItems: 'center'
	},

	institutionSelectorContent: {
		flex: 1,
		marginRight: 10
	},

	institutionSelectorText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#333'
	},

	institutionSelectorPlaceholder: {
		color: '#999',
		fontWeight: '400'
	},

	institutionCode: {
		fontSize: 12,
		color: '#777',
		marginTop: 2
	},

	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		marginBottom: 16,
		height: 52
	},

	passwordInput: {
		flex: 1,
		paddingHorizontal: 16,
		fontSize: 16,
		color: '#333',
		height: '100%'
	},

	eyeIcon: {
		paddingHorizontal: 15,
		height: '100%',
		justifyContent: 'center'
	},

	button: {
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 8
	},

	buttonText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: 'bold'
	},

	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'center',
		paddingHorizontal: 20
	},

	modalContent: {
		backgroundColor: '#FFF',
		borderRadius: 16,
		padding: 18,
		maxHeight: '75%',
		minHeight: 320
	},

	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 16
	},

	modalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333'
	},

	modalSubtitle: {
		fontSize: 12,
		color: '#777',
		marginTop: 3
	},

	modalCloseButton: {
		padding: 4
	},

	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 10,
		paddingHorizontal: 12,
		height: 48,
		marginBottom: 12
	},

	searchInput: {
		flex: 1,
		marginHorizontal: 8,
		fontSize: 15,
		color: '#333',
		height: '100%'
	},

	modalLoading: {
		flex: 1,
		minHeight: 180,
		justifyContent: 'center',
		alignItems: 'center'
	},

	modalLoadingText: {
		marginTop: 10,
		color: '#777',
		fontSize: 13
	},

	institutionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 13,
		borderBottomWidth: 1,
		borderBottomColor: '#EFEFEF'
	},

	institutionItemIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#EEF1FA',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 11
	},

	institutionItemInfo: {
		flex: 1
	},

	institutionItemName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333'
	},

	institutionItemCode: {
		fontSize: 12,
		color: '#777',
		marginTop: 2
	},

	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40
	},

	emptyStateText: {
		color: '#888',
		fontSize: 13,
		marginTop: 8
	}
});
