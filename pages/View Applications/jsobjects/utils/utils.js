export default {
	initialize: () => {
		storeValue('docIndex', 0);
	},

	signOut: async () => {
		clearStore('token', null).then(() => navigateTo('Login'));
	},

	userToken: async () => {
		const token = appsmith.store.token;
		return jsonwebtoken.decode(token, 'secret');
	},

	getApplications: async () => {
		const applications = await getApplications.run();
		const status = sel_status.selectedOptionValue;
		const date = sel_date.selectedOptionValue;


		let filteredApplications = applications;

		if (status) {
			filteredApplications = applications.filter(a => a.status === status);
		}

		if (date) {
			if (date === 'Today') {
				const now = moment;
				filteredApplications = applications.filter(a => moment(a.created).isSame(now, 'day'))
			}
			if (date === 'Yesterday') {
				const yesterday = moment().subtract(1, 'day').startOf('day');
				filteredApplications = applications.filter(a => moment(a.created).isSame(yesterday, 'day'))
			}
			if (date === '7 days') {
				const last7Days = moment().subtract(7, 'day').startOf('day');
				filteredApplications = applications.filter(a => moment(a.created).isAfter(last7Days, 'day'))
			}
			if (date === '30 days') {
				const last30Days = moment().subtract(30, 'day').startOf('day');
				filteredApplications = applications.filter(a => moment(a.created).isAfter(last30Days, 'day'))
			}
			if (date === '3 months') {
				const last3Months = moment().subtract(90, 'day').startOf('day');
				filteredApplications = applications.filter(a => moment(a.created).isAfter(last3Months, 'day'))
			}
		}

		return filteredApplications.map(a => {
			return {
				Id: a.id,
				Name: a.first_name + ' ' + a.last_name,
				Amount: a.amount_requested.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				AppliedOn: new Date(a.created).toDateString(),
				Status: a.status,
				Email: a.email,
				Phone: a.phone,
				DOB: a.date_of_birth,
				Gender: a.gender,
				Address: a.address,
				CreditProduct: a.credit_product,
				Term: parseInt(a.term),
				Interest: a.interest,
				RepaymentPeriod: a.repayment_period,
				TRN_No: a.trn_number,
				MonthlyIncome: parseInt(a.monthly_income).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				AmountOffered: a.amount_offered ? a.amount_offered.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '',
				CreditScore: a.credit_score,
				CreditRisk: a.credit_risk,
				CreditDefault: a.credit_default,
				Bank: a.bank_name,
				BankNo: a.bank_code || '',
				BankAccount: a.bank_account_no || '',
				BankAccountType: a.bank_account_type || '',
				Image: a.image_url,
				Created: a.created,
			}
		})
	},

	getMonthlyInstallment: () => {
		const interestRate = tbl_applications.selectedRow.Interest;
		const totalPayments = tbl_applications.selectedRow.Term * 12;
		const requestedAmount = parseInt(tbl_applications.selectedRow.AmountOffered.replace(/[^\d.-]/g, ''));

		const finalPayback = requestedAmount + (requestedAmount * interestRate / 100);

		const monthylyPayback = finalPayback / totalPayments;

		// If Requested amount has not been set, then no monthly installments can be calculated
		return tbl_applications.selectedRow.AmountOffered ? parseInt(monthylyPayback.toFixed(2)).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : ''
	},

	returnCreditRiskColor: () => {
		if (tbl_applications.selectedRow.CreditRisk === 'Low') {
			return 'RGB(0, 128, 0)'
		};
		if (tbl_applications.selectedRow.CreditRisk === 'Medium') {
			return 'RGB(255, 165, 0)';
		};
		if (tbl_applications.selectedRow.CreditRisk === 'High') {
			return 'RGB(255, 0, 0)'
		}
		return 'RGB(255, 165, 0)'
	},

	loanStatusColor: (status) => {
		if (status === 'Approved' || status === 'Disbursed' || status === 'Active') {
			return 'RGB(0, 128, 0)'
		}
		if (status === 'Rejected' || status === 'Late' || status === 'At Risk' || status === 'Closed') {
			return 'RGB(255, 0, 0)'
		}
		return 'RGB(255, 165, 0)';
	},

	userPayments: async () => {
		const payments = await getUserPayments.run()
		return payments.map(p => {
			return {
				Date: p.payment_date,
				Principal: p.principal,
				Interest: p.interest,
				Amount: p.amount,
				Status: p.status,
			}
		})
	},

	handleDocumentSwitch: async (action) => {
		const totalDoc = await getLoanDocuments.run();
		const totalDocLength = totalDoc.length;
		const prevDocIndex = appsmith.store.docIndex || 0;

		if (action === 'INCREASE') {

			if (prevDocIndex == parseInt(totalDocLength) - 1) {
				return;
			}

			storeValue('docIndex', prevDocIndex + 1);
		} else {
			if (prevDocIndex === 0) {
				return;
			}

			storeValue('docIndex', prevDocIndex - 1);
		}
	},

	setLoanDocuments: async () => {
		const loanDocuments = await getLoanDocuments.run();
		if (loanDocuments) {
			storeValue('loanDocument', loanDocuments);
		}
	},

	updateBankAccount: async () => {
		await updateBankDetails.run();

		await this.getApplications();

		showAlert('Bank Account Updated!', 'success');
	},

	returnDocType: () => {
		const loanDocument = appsmith.store.loanDocument;
		const docIndex = appsmith.store.docIndex;
		let docType = '';

		if (loanDocument && loanDocument.length > 0) {
			docType = loanDocument[docIndex].document_type;
		}

		return docType;
	},

	returnDocImg: () => {
		const loanDocument = appsmith.store.loanDocument;
		const docIndex = appsmith.store.docIndex;
		let docImg = '';

		if (loanDocument && loanDocument.length > 0) {
			docImg = loanDocument[docIndex].data;
		}

		return docImg;
	},

	dashboardData: async () => {
		const allPayments = await getAllUserPayments.run();
		const allApplications = await getAllApplications.run();

		const paidPayments = allPayments.filter(payment => payment.status === 'Paid');
		const totalAmountCollected = paidPayments.reduce((total, payment) => total + payment.amount, 0);
		const disbursedAmount = allApplications.reduce((total, payment) => total + payment.amount_offered, 0);
		const latePayments = await getPaymentByStatus.run({
			status: 'Late'
		})
		const atRiskPayments = await getPaymentByStatus.run({
			status: 'At Risk'
		})
		const closedPayments = await getPaymentByStatus.run({
			status: 'Closed'
		})
		const lossPayments = closedPayments.filter(p => p.payment_status === 'Unpaid');

		const latePaymentCount = latePayments.reduce((total, payment) => total + payment.payment_amount, 0);
		const atRiskPaymentCount = atRiskPayments.reduce((total, payment) => total + payment.payment_amount, 0);
		const lossPaymentsCount = lossPayments.reduce((total, payment) => total + payment.payment_amount, 0)

		const today = new Date();
		const lastMonthStart = new Date(today.getFullYear(), 2, 1);
		const lastMonthEnd = new Date(today.getFullYear(), 3, 0);
		const thisMonthStart = new Date(today.getFullYear(), 3, 1);

		// Perc for repaid
		const lastMonthPayments = paidPayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
		});
		const thisMonthPayments = paidPayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= thisMonthStart;
		});

		const lastMonthAmountCollected = lastMonthPayments.reduce((total, payment) => total + payment.amount, 0);
		const thisMonthAmountCollected = thisMonthPayments.reduce((total, payment) => total + payment.amount, 0);

		const percentageDifference = ((thisMonthAmountCollected - lastMonthAmountCollected) / lastMonthAmountCollected) * 100;

		// Perc for disbursements
		const lastMonthDisbursement = allApplications.filter(payment => {
			const paymentDate = new Date(payment.created);
			return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
		});
		const thisMonthDisbursement = allApplications.filter(payment => {
			const paymentDate = new Date(payment.created);
			return paymentDate >= thisMonthStart;
		});

		const lastMonthAmountDisbursed = lastMonthDisbursement.reduce((total, payment) => total + payment.amount_offered, 0);
		const thisMonthAmountDisbursed = thisMonthDisbursement.reduce((total, payment) => total + payment.amount_offered, 0);

		const percentageDifferenceDisbursed = ((thisMonthAmountDisbursed - lastMonthAmountDisbursed) / lastMonthAmountDisbursed) * 100;

		// Perc for late
		const lastMonthLatePayments = latePayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
		});
		const thisMonthLatePayments = latePayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= thisMonthStart;
		});

		const lastMonthLatePayment = lastMonthLatePayments.reduce((total, payment) => total + payment.payment_amount, 0);
		const thisMonthLatePayment = thisMonthLatePayments.reduce((total, payment) => total + payment.payment_amount, 0);

		const percentageDifferenceLatePayment = ((thisMonthLatePayment - lastMonthLatePayment) / lastMonthLatePayment) * 100;

		// Perc for At Risk
		const lastMonthAtRiskPayments = atRiskPayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
		});
		const thisMonthAtRiskPayments = atRiskPayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= thisMonthStart;
		});

		const lastMonthAtRiskPayment = lastMonthAtRiskPayments.reduce((total, payment) => total + payment.payment_amount, 0);
		const thisMonthAtRiskPayment = thisMonthAtRiskPayments.reduce((total, payment) => total + payment.payment_amount, 0);

		const percentageDifferenceAtRiskPayment = ((thisMonthAtRiskPayment - lastMonthAtRiskPayment) / lastMonthAtRiskPayment) * 100;

		// Perc for Loss
		const lastMonthLossPayments = lossPayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
		});
		const thisMonthLossPayments = lossPayments.filter(payment => {
			const paymentDate = new Date(payment.payment_date);
			return paymentDate >= thisMonthStart;
		});

		const lastMonthLossPayment = lastMonthLossPayments.reduce((total, payment) => total + payment.payment_amount, 0);
		const thisMonthLossPayment = thisMonthLossPayments.reduce((total, payment) => total + payment.payment_amount, 0);

		const percentageDifferenceLossPayment = ((thisMonthLossPayment - lastMonthLossPayment) / lastMonthLossPayment) * 100;

		return { 
			amountRepaid: totalAmountCollected.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 
			repaidDiff: percentageDifference.toFixed(2), 
			disbursedAmount: disbursedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
			disbursedDiff: percentageDifferenceDisbursed.toFixed(2),
			latePayment: latePaymentCount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
			latePaymentDiff: percentageDifferenceLatePayment.toFixed(2),
			atRiskPayment: atRiskPaymentCount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
			atRiskPaymentDiff: percentageDifferenceAtRiskPayment.toFixed(2),
			lossPayments: lossPaymentsCount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
			lossPaymentDiff: percentageDifferenceLossPayment.toFixed(2),
		}
	},

	rejectApplication: async () => {
		await rejectLoan.run()
		await this.getApplications();
		closeModal('mdl_rejectLoan');
		showAlert(`Application Rejected!`, 'success');
	},

	acceptApplication: async () => {
		await acceptLoan.run()
		await this.getApplications();
		closeModal('mdl_acceptLoan');
		showAlert(`Application Accepted!`, 'success');
	},

	disbursePayment: async () => {
		if (!tbl_applications.selectedRow.Bank || !tbl_applications.selectedRow.BankNo) {
			return showAlert('Add bank details to continue', 'warning');
		}

		const amountOffered = parseInt(tbl_applications.selectedRow.AmountOffered.replace(/[^\d.-]/g, ''))

		const noOfMonths = tbl_applications.selectedRow.Term * 12 || 12;
		const interest = amountOffered * (tbl_applications.selectedRow.Interest / 100);
		const totalReturned = amountOffered + interest;

		const monthlyFee = totalReturned / noOfMonths;
		let startDate = new Date(tbl_applications.selectedRow.Created);

		const promises = [];

		for (let i = 0; i < noOfMonths; i++) {
			startDate.setMonth(startDate.getMonth() + 1);
			promises.push(createLoanPayment.run({
				amount: monthlyFee.toFixed(2),
				paymentDate: startDate.toISOString(),
			}));
		}

		await Promise.all(promises);

		await updateApplicationStatus.run({
			status: 'Disbursed'
		})
		
		await this.getApplications();

		await this.userPayments();

		closeModal('mdl_disburse');

		showAlert(`Loan Disbursed!`, 'success');
	},

	createNewApplication: async () => {

		const profileImgExists = fpk_uploadProfileImg.files && fpk_uploadProfileImg.files.length > 0;
		const loanDocumentExists = fpk_documentUpload.files && fpk_documentUpload.files.length > 0;
		let profileImage = null;
		let loanDocument = null;

		if (profileImgExists) {
			profileImage = await cloudinaryImageUpload.run({
				data: fpk_uploadProfileImg.files[0].data,
			});
		}

		if (loanDocumentExists) {
			loanDocument = await cloudinaryImageUpload.run({
				data: fpk_documentUpload.files[0].data,
			});
		}

		const newApplication = await createApplication.run({
			imageUrl: profileImgExists ? profileImage?.url : null
		});
		

		if (loanDocumentExists) {
			await createLoanDocument.run({
				document: loanDocument.url,
				loanId: newApplication[0].id
			})
		}

		await this.getApplications();

		closeModal('mdl_newApplication');

		showAlert('Application Created!', 'success');
	},

}