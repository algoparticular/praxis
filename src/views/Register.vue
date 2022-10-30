<script setup>
    import { ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { getAuth, 
             createUserWithEmailAndPassword,
             GoogleAuthProvider,
             signInWithPopup
           } from 'firebase/auth';

    const email = ref('');
    const password = ref('');
    const router = useRouter();
    const auth = getAuth();
    const errorMessage = ref('');

    const register = () => {
        createUserWithEmailAndPassword(auth, email.value, password.value)
            .then((data) => {
                console.log('succesful sign up!');

                console.log(auth.currentUser);

                router.push('/collection'); // redirect to the feed
            })
            .catch((error) => {
                console.log(error.code);
                errorMessage.value = error.message;
            })
    }

    const signInWithGoogle = () => {        
        const provider = new GoogleAuthProvider();

        signInWithPopup(getAuth, provider)
            .then((result) => {
                console.log(result.user);
                router.push('/collection');
            })
            .catch((error) => {
                
            });
    }
</script>

<template>
    <div class="content">
        <main class="formWrapper">
            <div class="heading">
                <h2>{{ $t("auth.registerTitle") }}</h2>
                <p>{{ $t("auth.registerDescrip") }}</p>
            </div>  
            <div class="form">
                <input type="text" :placeholder="$t('auth.formEmail')" v-model="email" />
                <input type="password" :placeholder="$t('auth.formPassword')" v-model="password" />
                <span v-if="errorMessage">{{ errorMessage }}</span>
            </div>      
            <div class="actions">
                <button @click="register">{{ $t("auth.registerSubmit") }}</button>
                <!-- <button @click="signInWithGoogle">{{ $t("auth.registerGoogle") }}</button> -->
            </div>
        </main>
    </div>
</template>

<style scoped>

</style>