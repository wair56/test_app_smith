export default {
	init: () => {
		const notFirstTime = appsmith.store.isFirstTime;

		if (!notFirstTime) {
			showModal('mdl_appInfo')
		} else {
			storeValue('notFirstTime', true);
		}
	},

	generateDemoHash: async () => {
		return dcodeIO.bcrypt.hashSync('123456', 10);
	},

	verifyHash: async (password, hash) => {
		return dcodeIO.bcrypt.compareSync(password, hash)
	},

	createToken: async (user) => {
		return jsonwebtoken.sign(user, 'secret', {expiresIn: 60*60});
	},

	signIn: async () => {
		const email = inp_email.text;
		const password = inp_password.text;

		const [user] = await findUserByEmail.run({email});

		if (user && this.verifyHash(password, user?.password_hash)) {
			storeValue('token', await this.createToken(user))
				.then(() => updateLogin.run({
				id: user.id
			}))
				.then(() => navigateTo('View Applications'))
		} else {
			return showAlert('Invalid emaill/password combination', 'error');
		}
	},
}