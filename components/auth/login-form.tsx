"use client"

import { Loader2Icon } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  sendMagicLink,
  signInWithPassword,
  signUp,
  type AuthFormState,
} from "@/lib/actions/auth"

interface LoginFormProps {
  next: string
  initialError?: string
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  return (
    <Tabs defaultValue="password" className="rounded-xl border bg-card p-4">
      <TabsList className="w-full">
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="magic">Magic link</TabsTrigger>
      </TabsList>
      <TabsContent value="password" className="pt-2">
        <PasswordForm next={next} initialError={initialError} />
      </TabsContent>
      <TabsContent value="magic" className="pt-2">
        <MagicLinkForm next={next} />
      </TabsContent>
    </Tabs>
  )
}

function PasswordForm({ next, initialError }: LoginFormProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [signInState, signInAction, signingIn] = useActionState<AuthFormState, FormData>(
    signInWithPassword,
    { error: initialError }
  )
  const [signUpState, signUpAction, signingUp] = useActionState<AuthFormState, FormData>(signUp, {})
  const isSignUp = mode === "sign-up"
  const state = isSignUp ? signUpState : signInState
  const pending = signingIn || signingUp

  return (
    <form action={isSignUp ? signUpAction : signInAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {isSignUp ? "Create account" : "Sign in"}
      </Button>
      <button
        type="button"
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
      >
        {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  )
}

function MagicLinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(sendMagicLink, {})

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <Field id="magic-email" label="Email">
        <Input id="magic-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        Send magic link
      </Button>
    </form>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function FormStatus({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    )
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-emerald-500">
        {state.message}
      </p>
    )
  }
  return null
}
