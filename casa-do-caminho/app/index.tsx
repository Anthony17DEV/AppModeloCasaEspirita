import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	Image
} from 'react-native';
import { router } from 'expo-router';

const COR_PRINCIPAL = '#1B2669';

export default function LoginScreen() {
	const [usuarioSalvo, setUsuarioSalvo] = useState<{ nome: string; login: string } | null>({
		nome: 'Irmão João',
		login: 'joao.silva'
	});

	const [codigoInstituicao, setCodigoInstituicao] = useState('');
	const [login, setLogin] = useState('');
	const [senha, setSenha] = useState('');

	const handleLogin = () => {
		router.replace('/home');
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}
		>
			<View style={styles.formContainer}>

				<Image
					source={require('@/assets/images/logo.png')}
					style={styles.logo}
					resizeMode="contain"
				/>

				{usuarioSalvo ? (
					<View style={styles.savedUserContainer}>
						<Text style={styles.title}>Bem-vindo de volta!</Text>

						<TouchableOpacity style={styles.userCard} onPress={handleLogin} activeOpacity={0.8}>
							<View style={styles.avatarPlaceholder}>
								<Text style={styles.avatarText}>{usuarioSalvo.nome.charAt(0)}</Text>
							</View>
							<View style={styles.userInfo}>
								<Text style={styles.userName}>{usuarioSalvo.nome}</Text>
								<Text style={styles.userLogin}>Toque para entrar</Text>
							</View>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.switchAccountBtn}
							onPress={() => setUsuarioSalvo(null)}
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
							keyboardType="numeric"
						/>

						<TextInput
							style={styles.input}
							placeholder="Login"
							placeholderTextColor="#999"
							value={login}
							onChangeText={setLogin}
							autoCapitalize="none"
						/>

						<TextInput
							style={styles.input}
							placeholder="Senha"
							placeholderTextColor="#999"
							value={senha}
							onChangeText={setSenha}
							secureTextEntry={true}
						/>

						<TouchableOpacity
							style={[styles.button, { backgroundColor: COR_PRINCIPAL }]}
							onPress={handleLogin}
							activeOpacity={0.8}
						>
							<Text style={styles.buttonText}>Entrar</Text>
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
	logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 24 },

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
		marginBottom: 24,
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
	userLogin: { fontSize: 14, color: '#666', marginTop: 4 },

	switchAccountBtn: { padding: 10 },
	switchAccountText: { color: COR_PRINCIPAL, fontSize: 16, fontWeight: '600' },

	input: {
		backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 16,
		paddingVertical: 14, fontSize: 16, marginBottom: 16,
		borderWidth: 1, borderColor: '#E0E0E0', color: '#333',
	},
	button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
	buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});