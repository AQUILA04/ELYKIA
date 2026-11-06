/**
 * Le backend emploie cette formulation lorsqu'un client a déjà un compte.
 * La synchronisation reprend alors ce compte au lieu de le traiter comme un échec.
 */
export function isExistingAccountMessage(message?: string | null): boolean {
    return !!message && message.toLocaleLowerCase('fr').includes('déjà un compte');
}

export async function presentExistingAccountNotice(message: string): Promise<void> {
    try {
        const { ToastController } = await import('@ionic/angular');
        const toastController = new ToastController();
        const toast = await toastController.create({
            message,
            duration: 4500,
            color: 'warning',
            position: 'bottom'
        });
        await toast.present();
    } catch (error) {
        console.warn('Impossible d\'afficher le message de compte existant', error);
    }
}
