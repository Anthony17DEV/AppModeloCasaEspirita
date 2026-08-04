import React, { useState, useEffect } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Platform,
	KeyboardAvoidingView,
	Alert,
	ActivityIndicator,
	StatusBar,
	Image
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../src/services/apiService';
import MenuLateral from '@/components/MenuLateral';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#f4f6f8';

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

export default function PerfilScreen() {
	const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isPrimeiroAcesso, setIsPrimeiroAcesso] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const [nome, setNome] = useState('');
	const [cpf, setCpf] = useState('');
	const [email, setEmail] = useState('');
	const [telefone, setTelefone] = useState('');
	const [novaSenha, setNovaSenha] = useState('');
	const [confirmarSenha, setConfirmarSenha] = useState('');
	const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

	useEffect(() => {
		const carregarSessao = async () => {
			const session = await AsyncStorage.getItem('@user_session');
			if (session) {
				const user = JSON.parse(session);
				setUsuarioLogado(user);
				setNome(user.nome || '');
				setCpf(user.cpf || '');
				setEmail(user.email || 'Não informado');
				setTelefone(user.telefone || 'Não informado');

				if (user.foto_perfil) {
					setFotoPerfil(user.foto_perfil);
				}

				if (user.primeiro_acesso == 1) {
					setIsPrimeiroAcesso(true);
					setIsEditing(true);
					Alert.alert("Atenção", "Por questões de segurança, você precisa criar uma nova senha antes de continuar.");
				}
			}
		};
		carregarSessao();
	}, []);

	const handleEscolherFoto = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.3,
			base64: true,
		});

		if (!result.canceled && result.assets[0].base64) {
			const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
			setFotoPerfil(imageUri);
			setIsEditing(true);
		}
	};

	const handleSalvar = async () => {
		if (isEditing && isPrimeiroAcesso) {
			if (!novaSenha || novaSenha.length < 4) {
				Alert.alert("Erro", "A nova senha deve ter no mínimo 4 caracteres.");
				return;
			}
			if (novaSenha !== confirmarSenha) {
				Alert.alert("Erro", "As senhas não coincidem!");
				return;
			}
		}

		setIsLoading(true);
		try {
			const payload = {
				id_usuario: usuarioLogado.id,
				nome: nome,
				nova_senha: novaSenha,
				foto_perfil: fotoPerfil
			};

			const response = await apiService.api.post('api_atualizar_perfil.php', payload);
			const resData = parseJSONSeguro(response.data);

			if (resData && resData.success) {
				Alert.alert("Sucesso!", resData.message);
				setIsEditing(false);

				const updatedUser = { ...usuarioLogado, nome: nome, primeiro_acesso: 0, foto_perfil: fotoPerfil };
				await AsyncStorage.setItem('@user_session', JSON.stringify(updatedUser));

				if (isPrimeiroAcesso) {
					setIsPrimeiroAcesso(false);
					router.replace('/home');
				}
			} else {
				Alert.alert("Erro", resData?.message || "Erro ao atualizar perfil.");
			}
		} catch (error) {
			Alert.alert("Erro de Conexão", "Não foi possível comunicar com o servidor.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = () => {
		Alert.alert(
			"Sair da Conta",
			"Tem certeza que deseja sair do aplicativo?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Sair",
					style: "destructive",
					onPress: async () => {
						await AsyncStorage.removeItem('@user_session');
						router.replace('/');
					}
				}
			]
		);
	};

	if (!usuarioLogado) return null;

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={COR_PRIMARIA} />

			<View style={styles.headerBar}>
				{!isPrimeiroAcesso ? (
					<TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
						<Ionicons name="menu" size={28} color="#FFF" />
					</TouchableOpacity>
				) : (
					<View style={{ width: 48 }} />
				)}

				<Text style={styles.headerBarTitle}>{isPrimeiroAcesso ? 'Crie sua Senha' : 'Meu Perfil'}</Text>
				<View style={{ width: 48 }} />
			</View>

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>

					<View style={styles.avatarSection}>
						<View style={styles.avatarContainer}>
							{fotoPerfil ? (
								<Image source={{ uri: fotoPerfil }} style={styles.avatarImage} />
							) : (
								<Ionicons name="person" size={60} color={COR_PRIMARIA} />
							)}
							<TouchableOpacity style={styles.editAvatarButton} onPress={handleEscolherFoto}>
								<Ionicons name="camera" size={16} color="#1B2669" />
							</TouchableOpacity>
						</View>
						<Text style={styles.userName}>{nome}</Text>
						<Text style={styles.userRole}>{usuarioLogado.nivel_acesso} | Casa: {usuarioLogado.codigo_casa}</Text>
					</View>

					<View style={styles.sectionContainer}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Meus Dados</Text>

							{!isPrimeiroAcesso && (
								<TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
									<Text style={styles.editToggleText}>
										{isEditing ? 'Cancelar' : 'Editar'}
									</Text>
								</TouchableOpacity>
							)}
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Nome Completo</Text>
							<View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
								<Ionicons name="person-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
								<TextInput
									style={styles.input}
									value={nome}
									onChangeText={setNome}
									editable={isEditing}
								/>
							</View>
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>CPF (Login)</Text>
							<View style={[styles.inputWrapper, styles.inputDisabled]}>
								<Ionicons name="card-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
								<TextInput
									style={styles.input}
									value={cpf}
									editable={false}
								/>
							</View>
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>E-mail</Text>
							<View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
								<Ionicons name="mail-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
								<TextInput
									style={styles.input}
									value={email}
									onChangeText={setEmail}
									editable={isEditing}
									keyboardType="email-address"
									autoCapitalize="none"
								/>
							</View>
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Telefone / WhatsApp</Text>
							<View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
								<Ionicons name="logo-whatsapp" size={20} color="#7F8C8D" style={styles.inputIcon} />
								<TextInput
									style={styles.input}
									value={telefone}
									onChangeText={setTelefone}
									editable={isEditing}
									keyboardType="phone-pad"
								/>
							</View>
						</View>

						{isEditing && (
							<>
								<View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 15 }} />

								<Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Segurança</Text>

								<View style={styles.inputContainer}>
									<Text style={styles.label}>{isPrimeiroAcesso ? 'Crie uma Nova Senha' : 'Nova Senha (Opcional)'}</Text>
									<View style={styles.inputWrapper}>
										<Ionicons name="lock-closed-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
										<TextInput
											style={styles.input}
											placeholder="Digite a nova senha"
											secureTextEntry
											value={novaSenha}
											onChangeText={setNovaSenha}
										/>
									</View>
								</View>

								<View style={styles.inputContainer}>
									<Text style={styles.label}>Confirmar Senha</Text>
									<View style={styles.inputWrapper}>
										<Ionicons name="shield-checkmark-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
										<TextInput
											style={styles.input}
											placeholder="Repita a senha"
											secureTextEntry
											value={confirmarSenha}
											onChangeText={setConfirmarSenha}
										/>
									</View>
								</View>
							</>
						)}

					</View>

					{isEditing ? (
						<TouchableOpacity style={styles.btnSalvarFull} onPress={handleSalvar} disabled={isLoading}>
							{isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSalvarFullText}>{isPrimeiroAcesso ? 'Salvar e Entrar' : 'Salvar Alterações'}</Text>}
						</TouchableOpacity>
					) : (
						!isPrimeiroAcesso && (
							<TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
								<Feather name="log-out" size={20} color="#FFF" style={{ marginRight: 8 }} />
								<Text style={styles.btnLogoutText}>Sair da Conta</Text>
							</TouchableOpacity>
						)
					)}

					<View style={{ height: 40 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			<MenuLateral
				isOpen={isMenuOpen}
				onClose={() => setIsMenuOpen(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COR_FUNDO },
	scrollContent: { flex: 1, backgroundColor: COR_FUNDO },

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

	avatarSection: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
	avatarContainer: {
		width: 100, height: 100, borderRadius: 50, backgroundColor: '#EBF4FC',
		justifyContent: 'center', alignItems: 'center', borderWidth: 3,
		borderColor: COR_DETALHE, position: 'relative', elevation: 3,
	},
	avatarImage: { width: 94, height: 94, borderRadius: 47 },
	editAvatarButton: {
		position: 'absolute', bottom: 0, right: -5, backgroundColor: COR_DETALHE,
		width: 32, height: 32, borderRadius: 16, justifyContent: 'center',
		alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
	},
	userName: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginTop: 15 },
	userRole: { fontSize: 14, color: '#7F8C8D', marginTop: 4, fontWeight: '500' },

	sectionContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
	sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COR_PRIMARIA },
	editToggleText: { fontSize: 13, color: COR_FUNDO, fontWeight: 'bold', backgroundColor: COR_PRIMARIA, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },

	inputContainer: { marginBottom: 15 },
	label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
	inputWrapper: {
		flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9',
		borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, height: 50,
	},
	inputDisabled: { backgroundColor: '#f0f0f0', borderColor: '#eee' },
	inputIcon: { marginRight: 10 },
	input: { flex: 1, fontSize: 14, color: '#000' },

	btnSalvarFull: {
		backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center',
		alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10,
	},
	btnSalvarFullText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

	btnLogout: {
		backgroundColor: '#ED1C24', flexDirection: 'row', justifyContent: 'center',
		alignItems: 'center', padding: 18, borderRadius: 10, elevation: 3, marginTop: 10,
	},
	btnLogoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});