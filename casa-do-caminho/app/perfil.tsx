import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Platform,
	KeyboardAvoidingView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const COR_PRIMARIA = '#1B2669';
const COR_DETALHE = '#FDE910';
const COR_FUNDO = '#F8F9FA';

export default function PerfilScreen() {
	const [isEditing, setIsEditing] = useState(false);

	const [nome, setNome] = useState('Irmão João Silva');
	const [email, setEmail] = useState('joao.silva@email.com');
	const [telefone, setTelefone] = useState('(84) 99999-9999');
	const [dataNascimento, setDataNascimento] = useState('15/04/1985');

	const handleSalvar = () => {
		setIsEditing(false);
		alert('Dados atualizados com sucesso!');
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}
		>
			<StatusBar style="light" />

			<View style={styles.headerBar}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={26} color="#FFF" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Meu Perfil</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

				<View style={styles.avatarSection}>
					<View style={styles.avatarContainer}>
						<Ionicons name="person" size={60} color={COR_PRIMARIA} />

						<TouchableOpacity style={styles.editAvatarButton}>
							<Ionicons name="camera" size={16} color="#1B2669" />
						</TouchableOpacity>
					</View>
					<Text style={styles.userName}>{nome}</Text>
					<Text style={styles.userRole}>Associado Ativo</Text>
				</View>

				<View style={styles.formSection}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Dados Pessoais</Text>
						<TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
							<Text style={styles.editToggleText}>
								{isEditing ? 'Cancelar' : 'Editar'}
							</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Nome Completo</Text>
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
						<Text style={styles.inputLabel}>E-mail</Text>
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
						<Text style={styles.inputLabel}>WhatsApp / Telefone</Text>
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

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Data de Nascimento</Text>
						<View style={[styles.inputWrapper, !isEditing && styles.inputDisabled]}>
							<Ionicons name="calendar-outline" size={20} color="#7F8C8D" style={styles.inputIcon} />
							<TextInput
								style={styles.input}
								value={dataNascimento}
								onChangeText={setDataNascimento}
								editable={isEditing}
							/>
						</View>
					</View>

				</View>

				{isEditing && (
					<TouchableOpacity style={styles.saveButton} onPress={handleSalvar}>
						<Text style={styles.saveButtonText}>Salvar Alterações</Text>
					</TouchableOpacity>
				)}

				<View style={{ height: 40 }} />
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COR_FUNDO,
	},
	headerBar: {
		backgroundColor: COR_PRIMARIA,
		paddingTop: Platform.OS === 'ios' ? 55 : 45,
		paddingBottom: 20,
		paddingHorizontal: 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomLeftRadius: 25,
		borderBottomRightRadius: 25,
		elevation: 5,
		zIndex: 10,
	},
	backButton: { padding: 5 },
	headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

	content: { flex: 1 },

	avatarSection: {
		alignItems: 'center',
		marginTop: 30,
		marginBottom: 20,
	},
	avatarContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#EBF4FC',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: COR_DETALHE,
		position: 'relative',
		elevation: 3,
	},
	editAvatarButton: {
		position: 'absolute',
		bottom: 0,
		right: -5,
		backgroundColor: COR_DETALHE,
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#FFF',
	},
	userName: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginTop: 15 },
	userRole: { fontSize: 14, color: '#7F8C8D', marginTop: 4, fontWeight: '500' },

	formSection: {
		paddingHorizontal: 20,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		marginTop: 10,
	},
	sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COR_PRIMARIA },
	editToggleText: { fontSize: 14, color: COR_DETALHE, fontWeight: 'bold', backgroundColor: COR_PRIMARIA, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },

	inputContainer: { marginBottom: 16 },
	inputLabel: { fontSize: 13, color: '#7F8C8D', marginBottom: 6, fontWeight: '600', marginLeft: 4 },
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 12,
		paddingHorizontal: 15,
		height: 50,
	},
	inputDisabled: {
		backgroundColor: '#F0F2F5',
		borderColor: '#F0F2F5',
	},
	inputIcon: { marginRight: 10 },
	input: { flex: 1, fontSize: 16, color: '#2C3E50' },

	saveButton: {
		backgroundColor: COR_PRIMARIA,
		marginHorizontal: 20,
		marginTop: 10,
		height: 55,
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 3,
	},
	saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});