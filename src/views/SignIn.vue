<script setup>
    import { ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

    const email = ref('');
    const password = ref('');
    const router = useRouter();
    const auth = getAuth();
    const errorMessage = ref('');

    const signIn = () => {
        signInWithEmailAndPassword(auth, email.value, password.value)
            .then((data) => {
                console.log('succesful sign in!');

                console.log(auth.currentUser);

                router.push('/collection'); // redirect to the feed
            })
            .catch((error) => {
                console.log(error.code);
                
                switch(error.code) {
                    case "auth/invalid-email":
                        errorMessage.value = "Invalid email";
                        break;
                    case "auth/user-not-found":
                        errorMessage.value = "No account with this email was found";
                        break;
                    case "auth/wrong-password":
                        errorMessage.value = "Incorrect password";
                        break;
                    default:
                        errorMessage.value = "Email or Password was incorrect";
                        break;
                }
            })
    }
</script>

<template>
    <div class="content">
        <main class="formWrapper">
            <div class="heading">
                <h2>{{ $t("auth.signinTitle") }}</h2>
                <p>{{ $t("auth.signinDescrip") }}</p>
            </div>  
            <div class="form">
                <input type="text" :placeholder="$t('auth.formEmail')" v-model="email" />
                <input type="password" :placeholder="$t('auth.formPassword')" v-model="password" />
                <span v-if="errorMessage">{{ errorMessage }}</span>
            </div>      
            <div class="actions">
                <button @click="signIn">{{ $t("auth.signinSubmit") }}</button>
                <!-- <button @click="signInWithGoogle">{{ $t("auth.signinGoogle") }}</button> -->
            </div>
        </main>    
    </div>
</template>

<style scoped>

</style>