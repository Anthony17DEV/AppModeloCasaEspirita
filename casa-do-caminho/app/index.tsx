import React, { useState, useEffect } from 'react';
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
	ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { apiService } from '../src/services/apiService';

const COR_PRINCIPAL = '#1B2669';

const parseJSONSeguro = (resposta: any) => {
	if (typeof resposta === 'object') return resposta;
	let texto = String(resposta).trim();
	try { return JSON.parse(texto); } catch (e) { }
	try {
		const start = texto.indexOf('{"success"');
		if (start !== -1) {
			let sub = texto.substring(start);
			const end = sub.lastIndexOf('}');
			if (end !== -1) { return JSON.parse(sub.substring(0, end + 1)); }
		}
	} catch (e) { }
	return null;
};

export default function LoginScreen() {
	const [usuarioSalvo, setUsuarioSalvo] = useState<{ nome: string; cpf: string; codigo: string } | null>(null);

	const [codigoInstituicao, setCodigoInstituicao] = useState('');
	const [login, setLogin] = useState('');
	const [senha, setSenha] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [mostrarSenha, setMostrarSenha] = useState(false);

	useEffect(() => {
		const carregarUltimoLogin = async () => {
			const saved = await AsyncStorage.getItem('@last_user_login');
			if (saved) {
				const parsed = JSON.parse(saved);
				setUsuarioSalvo(parsed);
				setCodigoInstituicao(parsed.codigo);
				setLogin(parsed.cpf);
			}
		};
		carregarUltimoLogin();
	}, []);

	const handleLogin = async () => {
		if (!codigoInstituicao || !login || !senha) {
			Alert.alert("Atenção", "Preencha o Código da Instituição, CPF e a Senha.");
			return;
		}

		setIsLoading(true);
		try {
			const payload = {
				codigo: codigoInstituicao,
				cpf: login,
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
					codigo: userData.codigo_casa
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
		setCodigoInstituicao('');
		setLogin('');
		setSenha('');
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
								<Text style={styles.avatarText}>{usuarioSalvo.nome.charAt(0)}</Text>
							</View>
							<View style={styles.userInfo}>
								<Text style={styles.userName}>{usuarioSalvo.nome}</Text>
								<Text style={styles.userLogin}>Casa: {usuarioSalvo.codigo} | CPF: {usuarioSalvo.cpf}</Text>
							</View>
						</View>

						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								placeholder="Digite sua Senha"
								placeholderTextColor="#999"
								value={senha}
								onChangeText={setSenha}
								secureTextEntry={!mostrarSenha}
							/>
							<TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarSenha(!mostrarSenha)}>
								<Feather name={mostrarSenha ? "eye" : "eye-off"} size={22} color="#999" />
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={[styles.button, { backgroundColor: COR_PRINCIPAL, width: '100%' }]}
							onPress={handleLogin}
							activeOpacity={0.8}
							disabled={isLoading}
						>
							{isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
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

						<TextInput
							style={styles.input}
							placeholder="Código da Instituição"
							placeholderTextColor="#999"
							value={codigoInstituicao}
							onChangeText={setCodigoInstituicao}
						/>

						<TextInput
							style={styles.input}
							placeholder="Login (CPF)"
							placeholderTextColor="#999"
							value={login}
							onChangeText={setLogin}
							keyboardType="numeric"
						/>

						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								placeholder="Senha"
								placeholderTextColor="#999"
								value={senha}
								onChangeText={setSenha}
								secureTextEntry={!mostrarSenha}
							/>
							<TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarSenha(!mostrarSenha)}>
								<Feather name={mostrarSenha ? "eye" : "eye-off"} size={22} color="#999" />
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={[styles.button, { backgroundColor: COR_PRINCIPAL }]}
							onPress={handleLogin}
							activeOpacity={0.8}
							disabled={isLoading}
						>
							{isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
						</TouchableOpacity>
					</View>
				)}

			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FFFFFF' },
	formContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },

	logo: { width: '80%', height: 130, alignSelf: 'center', marginBottom: 24 },

	title: { fontSize: 24, fontWeight: 'bold', color: '#333333', marginBottom: 8, textAlign: 'center' },
	subtitle: { fontSize: 16, color: '#666666', marginBottom: 32, textAlign: 'center' },

	savedUserContainer: { alignItems: 'center' },
	userCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		padding: 16,
		borderRadius: 12,
		width: '100%',
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	avatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: COR_PRINCIPAL,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
	},
	avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
	userInfo: { flex: 1 },
	userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
	userLogin: { fontSize: 13, color: '#666', marginTop: 4 },

	switchAccountBtn: { padding: 15, marginTop: 10 },
	switchAccountText: { color: COR_PRINCIPAL, fontSize: 15, fontWeight: '600' },

	input: {
		backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 16,
		height: 52, fontSize: 16, marginBottom: 16,
		borderWidth: 1, borderColor: '#E0E0E0', color: '#333',
	},

	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		marginBottom: 16,
		height: 52,
	},
	passwordInput: {
		flex: 1,
		paddingHorizontal: 16,
		fontSize: 16,
		color: '#333',
		height: '100%',
	},
	eyeIcon: {
		paddingHorizontal: 15,
		height: '100%',
		justifyContent: 'center',
	},

	button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
	buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});