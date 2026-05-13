import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { rules, useFormValidation } from '@/hooks/use-form-validation';
import { translateServerError } from '@/lib/error-translator';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    const { clientErrors, handleChange, handleBlur, validateAll, clearClientErrors } = useFormValidation({
        password: [rules.required('La contraseña es obligatoria.')],
    });

    return (
        <div className="">
            <Heading
                variant="small"
                title="Delete account"
                description="Delete your account and all of its resources"
            />
            <div className="">
                <div className="">
                    <p className="">Warning</p>
                    <p className="">
                        Please proceed with caution, this cannot be undone.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="destructive"
                            data-test="delete-user-button"
                        >
                            Delete account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>
                            Are you sure you want to delete your account?
                        </DialogTitle>
                        <DialogDescription>
                            Once your account is deleted, all of its resources
                            and data will also be permanently deleted. Please
                            enter your password to confirm you would like to
                            permanently delete your account.
                        </DialogDescription>

                        <Form
                            action={ProfileController.destroy.url()}
                            method="delete"
                            options={{
                                preserveScroll: true,
                            }}
                            onBefore={() => validateAll()}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className=""
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="">
                                        <Label
                                            htmlFor="password"
                                            className=""
                                        >
                                            Password
                                        </Label>

                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Password"
                                            autoComplete="current-password"
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />

                                        <InputError message={clientErrors.password || translateServerError(errors.password)} />
                                    </div>

                                    <DialogFooter className="">
                                        <DialogClose asChild>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    resetAndClearErrors();
                                                    clearClientErrors();
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            variant="destructive"
                                            disabled={processing}
                                            asChild
                                        >
                                            <button
                                                type="submit"
                                                data-test="confirm-delete-user-button"
                                            >
                                                Delete account
                                            </button>
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
