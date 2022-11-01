<script setup>
	import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';   
    import { animate, scroll } from "motion";

    //Database
    import Airtable from "airtable";
    const base = new Airtable({ apiKey: "keyLdBi48iZZkEOMG" }).base("appgHXHkRRjGjbYgM");

    const props = defineProps({
        id: String
    });

    const router = useRouter();
    const card = ref({});
    const cover = ref('');
    const color = ref('');
    const colorAlt = ref('');

    //This make possible the loading skeleton state
    const loadCardData = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                base('Oracle cards').select({
                    view: 'List',
                    filterByFormula: `id = "${props.id}"`
                }).firstPage(function(err, records) {
                    if (err) { console.error(err); return; }

                    card.value = records[0].fields;

                    cover.value = 'url(' + card.value.image[0].url + ')';
                    color.value = card.value.color;
                    colorAlt.value = card.value.colorAlt;                
                    
                    // console.log('done ' + color.value);
                    resolve();  
                });
            }, 3000)
        })
    }
    
    const data = ref(await loadCardData());   

    /////////////////
    // //ON MOUNTED
	// onMounted (() => {
        // const zoomElement = document.getElementsByClassName("cardWrapper"); 
        // const scrollOptions = {
        //     target: '.cardWrapper',
        //     offset: ["start", "center"]
        // }
        
        // scroll(
        //     animate(".illustration", { backgroundSize: "110%" }),
        //     scrollOptions
        // );
    // });    
 
</script>

<template>
	<main class="cardWrapper">
        <div class="imageWrapper">
            <div class="illustration"></div>
            
            <button class="action" @click="router.push({ path: '/share/'+props.id });">
                <!-- <svg class="icon share" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.0001 5.33301C20.4511 5.33301 20.8829 5.51583 21.1968 5.83972L26.7968 11.6175C27.4375 12.2785 27.421 13.3336 26.76 13.9742C26.0991 14.6149 25.0439 14.5984 24.4033 13.9374L21.6667 11.114V24.333C21.6667 25.2535 20.9205 25.9997 20.0001 25.9997C19.0796 25.9997 18.3334 25.2535 18.3334 24.333V11.114L15.5968 13.9374C14.9562 14.5984 13.9011 14.6149 13.2401 13.9742C12.5791 13.3336 12.5627 12.2785 13.2033 11.6175L18.8033 5.83972C19.1172 5.51583 19.549 5.33301 20.0001 5.33301Z"/>
                    <path d="M5.60772 25.6021C6.50233 25.3854 7.40321 25.9349 7.61989 26.8296L8.48927 30.4189C8.55589 30.6938 8.70736 30.928 8.9082 31.0898C9.10797 31.2508 9.34651 31.3329 9.58546 31.333H30.4147C30.6536 31.3329 30.8921 31.2508 31.0919 31.0898C31.2928 30.928 31.4442 30.6939 31.5109 30.4189L32.3802 26.8296C32.5969 25.9349 33.4978 25.3854 34.3924 25.6021C35.287 25.8187 35.8366 26.7196 35.6199 27.6142L34.7505 31.2037C34.5143 32.1787 33.9666 33.0543 33.1833 33.6855C32.3989 34.3175 31.4247 34.6662 30.4149 34.6663H9.58546C8.57572 34.6662 7.60121 34.3175 6.81684 33.6855C6.03349 33.0543 5.48587 32.1788 5.24965 31.2038L4.38023 27.6142C4.16355 26.7196 4.71311 25.8187 5.60772 25.6021Z"/>
                </svg> -->
                <svg class="icon share" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M7.13916 6.33333C6.69412 6.33333 6.33333 6.69412 6.33333 7.13916V31.8641C6.33333 32.3091 6.6941 32.6699 7.13916 32.6699H31.8641C32.3091 32.6699 32.6699 32.3091 32.6699 31.8641V24.0128C32.6699 23.0924 33.4161 22.3462 34.3365 22.3462C35.257 22.3462 36.0032 23.0924 36.0032 24.0128V31.8641C36.0032 34.1501 34.1501 36.0032 31.8641 36.0032H7.13916C4.85318 36.0032 3 34.1501 3 31.8641V7.13916C3 4.85317 4.85317 3 7.13916 3H14.5566C15.4771 3 16.2233 3.74619 16.2233 4.66667C16.2233 5.58714 15.4771 6.33333 14.5566 6.33333H7.13916ZM21.1321 4.66667C21.1321 3.74619 21.8783 3 22.7987 3H34.337C35.2575 3 36.0037 3.74619 36.0037 4.66667V16.2049C36.0037 17.1254 35.2575 17.8716 34.337 17.8716C33.4165 17.8716 32.6703 17.1254 32.6703 16.2049V8.68961L22.1636 19.1963C21.5128 19.8472 20.4575 19.8472 19.8066 19.1963C19.1558 18.5454 19.1558 17.4902 19.8066 16.8393L30.3126 6.33333H22.7987C21.8783 6.33333 21.1321 5.58714 21.1321 4.66667Z"/>
                </svg>

            </button>
        </div>
        
        <div class="textWrapper">
            <h4 v-if="card['affirmation_'+$i18n.locale] != null">
                {{ card['name_'+$i18n.locale] }}
            </h4>
            <p :class="{onlyDescription: card['affirmation_'+$i18n.locale] == null}">
                {{ card['description_'+$i18n.locale] }}
            </p>
            <div class="bottom">
                <div>
                    <h5 v-if="card['affirmation_'+$i18n.locale] != null">
                        {{ $t("oracle.cardAfirmattion") }}
                    </h5>
                    <p>
                        {{ card['affirmation_'+$i18n.locale] }}
                    </p>
                </div>
                <div v-if="card['invitation_'+$i18n.locale] != null">
                    <h5>
                        {{ $t("oracle.cardInvitation") }}
                    </h5>
                    <p>
                        {{ card['invitation_'+$i18n.locale] }}
                    </p>
                </div>
            </div>
        </div>                
    </main>
</template>

<style scoped>
    h4, h5, p {
        color: v-bind(colorAlt);
    }

    .cardWrapper {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 100vh;

        background-color: v-bind(color);
    }    

    .imageWrapper {
        position: relative;
        width: 100%;                
    }

    .illustration {
        width: 100%;
        height: 0;
        padding-top: 100%;
        background-image: v-bind(cover);
        background-size: cover;
        background-position: center;
        box-shadow: 0px 4px 42px rgba(16, 16, 15, 0.18) inset, 0px -4px 42px rgba(16, 16, 15, 0.18) inset;
    }

    button.action {
        position: absolute;
        right: 35px;
        bottom: -30px;
        filter: none;
        background-color: v-bind(colorAlt);
        border: 5px solid v-bind(color);
        width: 66px;
        height: 66px;

        -webkit-transition: border 270ms ease-out, 
                    background-color 150ms ease-out,
                    filter 150ms ease-out;
        transition: border 270ms ease-out, 
                    background-color 150ms ease-out,
                    filter 150ms ease-out;
    }

    button.action .icon path {
        fill: v-bind(color);
    }    

    .textWrapper {
        padding: 64px 40px;
    }

    .textWrapper h4 {
        letter-spacing: .03em;
    }

    .textWrapper p {
        padding: 0;
        text-align: justify;
        white-space: pre-line;
    }

    .textWrapper p.onlyDescription {
        text-align: center;
        padding: 40px 0;
    }

    .bottom {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 24px;
    }

    .bottom h5 {
        text-align: center;
    }

    .bottom p {
        text-align: center;
    }

    /* DESKTOP */
    @media screen and (min-width: 768px) {

        .cardWrapper {
            flex-direction: row;
            align-items: center;
            justify-content: space-around;            
            width: 82vw;
            padding: 0 9vw;           
        }

        .imageWrapper {
            width: 360px;
        }

        .illustration {       
            /* width: 360px; */
            height: 450px;
            padding-top: 0;
            
            border-radius: 24px;
            border: 9px solid #F7F8F1;
            filter: drop-shadow(0px 0px 3px rgb(234, 234, 234));
            box-shadow: none;

            box-sizing: border-box;
            -moz-box-sizing: border-box;
            -webkit-box-sizing: border-box;
        }

        button.action {
            background-color: #F7F8F1;
            border-color: #F7F8F1;
            filter: drop-shadow(0px 0px 1px rgb(234, 234, 234));
        }

        button.action:hover {
            background-color: v-bind(color);
            /* filter: drop-shadow(0px 0px 13px v-bind(colorAlt)); */
            filter: none;
            border-width: 3px;
        }

        button.action:hover .icon path {
            fill: v-bind(colorAlt);
        }

        .textWrapper {
            width: 40%;
            padding: 40px 0;
            /* height: 100vh; */
            display: flex;
            flex-direction: column;
            justify-content: center;
            /* overflow: scroll; */
        }

        .textWrapper p { 
            font-size: 16px;
        }
    }
</style>