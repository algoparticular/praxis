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
            <!-- <h5> {{ $t("oracle.share") }} </h5> -->
            <div class="card">
                <div class="illustration"></div>
                <p class="text">{{ card['affirmation_'+$i18n.locale] }}</p>
            </div>            
            <div class="buttons">
                <div class="linkWrapper">
                    <button class="social link" @click="copyUrl()">
                        <i class="fa fa-lg fa-link"></i>
                    </button>
                    <span v-if="showTooltip">{{ $t("oracle.linkCopied") }}</span>
                </div>

                <ShareNetwork
                    network="facebook"                    
                    :url="shareUrl"
                    :title="card['name_'+$i18n.locale]"
                    :description="card['affirmation_'+$i18n.locale]"
                    hashtags="PraxisApp"
                    class="social"
                    :style="{backgroundColor: '#1877F2'}" >
                        <i class="fab fah fa-lg fa-facebook-f"></i>
                </ShareNetwork>

                <ShareNetwork
                    network="twitter"
                    :url="shareUrl"
                    :title="card['affirmation_'+$i18n.locale]"
                    twitterUser="algoparticular"
                    hashtags="PraxisApp"
                    class="social"
                    :style="{backgroundColor: '#1DA1F2'}" >
                        <i class="fab fah fa-lg fa-twitter"></i>
                </ShareNetwork>

                <ShareNetwork
                    network="whatsapp"
                    :url="shareUrl"
                    :title="card['name_'+$i18n.locale]"
                    :description="card['affirmation_'+$i18n.locale]"

                    class="social"
                    :style="{backgroundColor: '#25D366'}" >
                        <i class="fab fah fa-lg fa-whatsapp"></i>
                </ShareNetwork>

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
        </main>

        <!-- <Toolbar :hideAction="true"/> -->
    </div>
</template>

<style scoped>
    .content {
        background-color: #143246;
        /* height: auto; */
    }   

    #share {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 80px;
        padding-top: 128px;
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
        gap: 32px;
    }

    .social {
        width: 50px !important;
        height: 50px;
        border-radius: 100%;
        background: #F7F8F1;
        display: flex;
        justify-content: center;
        align-items: center;

        transition: all .2s ease-in;
    }

    .social.link {
        color: #143246;
    }    

    .social:hover {
        color: #F7F8F1;
        /* background: #143246 !important; */
        /* filter: drop-shadow(0px 0px 3px rgb(234, 234, 234)); */
        background: #FF6F61 !important;
        filter: drop-shadow(0px 1px 2px rgba(255, 120, 16, .9));

        transform: scale(1.1);
    }   
    
    .linkWrapper {
        /* display:flex;
        flex-direction: column;
        justify-content: center;
        gap: 16px; */
        position: relative;
    }

    .linkWrapper span {
        color: #F7F8F1;
        display: inline-flex;
        align-self: center;
        position: absolute;
        bottom: -32px;
        left: -7px;
    }
</style>