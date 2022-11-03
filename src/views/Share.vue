<script setup>
    import Toolbar from '../components/Toolbar.vue';	
    import Header from '../components/Header.vue';	

    import { onBeforeMount, ref } from 'vue';
    import { useRoute, useRouter } from 'vue-router';

    //Database
    import Airtable from "airtable";
    const base = new Airtable({ apiKey: "keyLdBi48iZZkEOMG" }).base("appgHXHkRRjGjbYgM");

    const route = useRoute();
    const router = useRouter();
    const card = ref({});
    const cover = ref('');
    const color = ref('');
    const showTooltip = ref(false);

    const shareUrl = window.location.origin+'/card/'+route.params.id;

    const copyUrl = () => {
        navigator.clipboard.writeText(shareUrl);
        showTooltip.value = true;

        setTimeout(() => {
            showTooltip.value = false;
        }, 2000);
    };

    function goBack() {
        router.back();
    } 

    onBeforeMount (() => {
        base('Oracle cards').select({
            view: 'List'
        }).firstPage(function(err, records) {
            if (err) { console.error(err); return; }

            card.value = records[route.params.id].fields;

            cover.value = 'url(' + card.value.image[0].url + ')';
            color.value = card.value.color;
        });
    });  

</script>

<template>
    <div class="content">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/css/all.min.css" integrity="sha256-h20CPZ0QyXlBuAw7A+KluUYx/3pK+c7lYEpqLTlxjYQ=" crossorigin="anonymous" />
        
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
		
        <main id="share">
            <div class="card">
                <div class="illustration"></div>
                <p class="text">{{ card['affirmation_'+$i18n.locale] }}</p>
            </div>
            <div class="footer">
                <h4> {{ $t("oracle.share") }} </h4>
                <div class="buttons">
                    <div class="social">
                        <button class="shareButton link" @click="copyUrl()">
                            <i class="fa fa-lg fa-link"></i>
                        </button>
                        <span v-if="showTooltip">{{ $t("oracle.linkCopied") }}</span>
                        <span v-else>{{ $t("oracle.link") }}</span>
                    </div>

                    <div class="social">
                        <ShareNetwork
                            network="facebook"                    
                            :url="shareUrl"
                            :title="card['name_'+$i18n.locale]"
                            :description="card['affirmation_'+$i18n.locale]"
                            hashtags="PraxisApp"
                            class="shareButton"
                            :style="{backgroundColor: '#1877F2'}" >
                                <i class="fab fah fa-lg fa-facebook-f"></i>
                        </ShareNetwork>
                        <span>Facebook</span>
                    </div>
                
                    <div class="social">
                        <ShareNetwork
                            network="twitter"
                            :url="shareUrl"
                            :title="card['affirmation_'+$i18n.locale]"
                            twitterUser="algoparticular"
                            hashtags="PraxisApp"
                            class="shareButton"
                            :style="{backgroundColor: '#1DA1F2'}" >
                                <i class="fab fah fa-lg fa-twitter"></i>
                        </ShareNetwork>
                        <span>Twitter</span>
                    </div>

                    <div class="social">
                        <ShareNetwork
                            network="whatsapp"
                            :url="shareUrl"
                            :title="card['name_'+$i18n.locale]"
                            :description="card['affirmation_'+$i18n.locale]"

                            class="shareButton"
                            :style="{backgroundColor: '#25D366'}" >
                                <i class="fab fah fa-lg fa-whatsapp"></i>
                        </ShareNetwork>
                        <span>WhatsApp</span>
                    </div>

                    <!-- <ShareNetwork
                        network="messenger"
                        :url="shareUrl"
                        :title="card['affirmation_'+$i18n.locale]"

                        class="social"
                        :style="{background: 'radial-gradient(110% 110% at 16.75% 100%, #0099FF 0%, #A033FF 60%, #FF5280 90%, #FF7061 100%)'}" >
                            <i class="fab fah fa-lg fa-facebook-messenger"></i>
                    </ShareNetwork> -->

                    <!-- <button class="social more"></button> -->
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
    .content {
        background: #143246;
        background: linear-gradient(180deg, v-bind(color) 0%, v-bind(color) 9%, #143246 100%);
    }   

    #share {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        padding-top: 13vh;
        height: 87vh;
    }

    .footer {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 40px;
        padding: 10vh 0;
    }

    h4 {
        font-size: 24px;
        /* filter: drop-shadow(0px 0px 3px rgb(234, 234, 234)); */
    }

    .card {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .card .illustration {
        width: 220px;
        height: 275px;
        overflow: hidden;

        background-image: v-bind(cover);
        background-size: cover;
        background-position: center;
        border-radius: 24px;
        border: 8px solid #F7F8F1;
        filter: drop-shadow(0px 0px 3px rgb(234, 234, 234));

        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
    }

    .card .text {
        font-size: 16px;
        font-style: italic;
        text-align: center;
        max-width: 70%;
        margin-bottom: 0;
    }

    .buttons {
        display: flex;
        flex-wrap: wrap;
        width: 100vw;
        max-width: 374px;
        justify-content: space-around;        
    }

    .social {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 4px;
        min-width: 60px;
    }

    .social span {
        color: #F7F8F1;
        font-size: 13px;
        display: inline-flex;
    }

    .shareButton {
        width: 50px !important;
        height: 50px;
        border-radius: 100%;
        background: #F7F8F1;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;

        transition: all .2s ease-in;
    }

    .shareButton i {
        font-size: 1.5em;
    }

    .shareButton.link {
        color: #143246;
    }    

    .shareButton:hover {
        color: #F7F8F1;
        /* background: #143246 !important; */
        /* filter: drop-shadow(0px 0px 3px rgb(234, 234, 234)); */
        background: #FF6F61 !important;
        filter: drop-shadow(0px 1px 2px rgba(255, 120, 16, .9));

        transform: scale(1.1);
    }   
    
    /* DESKTOP */
    @media screen and (min-width: 768px) {

    }
</style>