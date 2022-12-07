<script setup>
	import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';    
	import Header from '../components/Header.vue';
	import { KinesisContainer, KinesisElement} from 'vue-kinesis';

    const router = useRouter();

    //handle navigation
    const navigate = (url) => {        
        router.push({ path: url }); //, replace: true
    };

</script>

<template>
	<div class="content home">
		<Header :hasMenu="true"/>
		<main id="home">
			<div class="corner topLeft"></div>
            <div class="corner bottomLeft"></div>
            <div class="corner topRight"></div>
            <div class="corner bottomRight"></div>
			<kinesis-container class="cover" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100">
				<kinesis-element 
					class="oracle particle"
					:strength="5"
					transformOrigin="bottom left"
					type="translate"/>
				<kinesis-element 
					class="oracle tree"
					:strength="9"
					type="translate"/>
			</kinesis-container>

			<div id="panel">
				<p>{{ $t("message.praxisIntro") }}</p>

				<button class="action big" @click="navigate('/oracle')">
					<svg class="icon seed" width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
						<path d="M19.0458 29.3486C19.0458 27.7255 19.0458 26.144 19.0458 24.4377C18.9627 22.1072 18.7964 21.9407 16.5107 22.0239C12.5626 22.1904 8.573 22.4817 4.70805 23.106C4.45869 23.106 4.08466 23.2725 3.83531 23.2725C3.12882 23.1892 2.50544 23.0227 2.17297 22.1904C1.8405 21.4829 2.00674 20.8586 2.50544 20.2344C3.66909 18.9026 5.16519 18.4448 6.82754 18.4448C9.57041 18.4448 12.2717 18.1951 15.0146 17.9038C18.5471 17.5293 18.5471 17.5293 18.5471 13.9085C18.5471 12.0358 18.0899 10.2462 17.8406 8.37344C17.7575 7.37463 17.5081 6.41743 17.6743 5.33537C17.9237 4.08685 18.9211 3.21289 19.9601 3.21289C20.999 3.29613 21.6224 4.00362 21.8302 5.46023C22.0796 8.41506 22.2873 11.3283 22.3705 14.1999C22.3705 16.8634 22.4536 16.8634 25.0302 16.8634C28.0224 16.8634 32.8017 16.9466 35.7108 16.9466C36.9575 16.9466 37.9965 17.7373 37.9965 18.6529C38.0796 19.6517 36.6666 21.3997 35.4614 21.2332C32.303 20.6922 27.3159 21.4829 24.0744 21.3997C22.9107 21.3997 22.5783 21.8575 22.6614 22.8979C22.8276 26.5602 22.9107 29.6815 23.2016 33.3022C23.2847 34.5508 22.8692 35.3415 21.8717 35.9657C20.4588 36.7565 19.0458 36.049 18.9626 34.3427C18.9626 32.9277 18.9627 31.1381 19.0458 29.3486Z" />
						<path d="M32.9656 33.3542C33.1379 31.8015 34.3438 30.5939 35.722 30.6801C37.0141 30.7664 38.0908 31.974 37.9185 33.2679C37.7463 34.6481 36.2819 35.942 34.9899 35.8557C33.7839 35.7694 32.8795 34.5618 32.9656 33.3542Z" />
						<path d="M9.08599 7.08943C9.08599 7.99586 7.36189 9.67924 6.32742 9.76557C5.12054 9.8519 4.04297 8.64332 4.04297 7.43474C4.12917 6.0535 5.42226 4.58594 6.41362 4.58594C7.62049 4.71543 9.08599 6.09667 9.08599 7.08943Z" />
						<path d="M31.3472 5.87653C31.4341 4.00559 32.4334 2.91783 34.1279 3.00485C35.2141 3.09188 36.17 4.22314 36.0831 5.22388C35.9962 6.6162 34.6058 8.18258 33.4327 8.18258C32.1727 8.22609 31.3472 7.26886 31.3472 5.87653Z" />
						<path d="M7.50161 37.2678C6.22091 37.1762 5.58057 36.3975 5.58057 35.115C5.58057 33.4661 7.1357 32.0004 8.69083 32.092C9.74283 32.1836 10.7491 33.1913 10.7491 34.3364C10.6119 35.8937 9.05674 37.3594 7.50161 37.2678Z" />
					</svg>
				</button>							
			</div>
		</main>        
	</div>
</template>

<style scoped>
	.content.home {
		background-color: #0282BB;
		background-image: url('../assets/oracle/stars.png');
        background-size: cover;
	}

	#home {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
	}		

	#panel {
        display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 40px;
    }	

    #panel p {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        font-size: 20px;
        line-height: 150%;
        letter-spacing: 0.02em;
        margin: 0;
        text-align: center;
		flex-shrink: 0;

		width: 90vw;
		max-width: 370px;
        min-height: 100px;
		color: #F7F8F1;
		filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 1));
    }  

	#home .cover {
		width: 100vw;
		min-height: 40vh;
	}

	.corner {        
        background-image: url('../assets/oracle/corner.png');
        background-size: contain;
        background-repeat: no-repeat;

        position: absolute;
        z-index: 3;
        top: 2vw;
        left: 2vw;
        width: 30vw;
        height: 30vw;
    }

    .corner.bottomLeft {
        top: auto;
        bottom: 2vw;
        transform: scaleY(-1);
    }

    .corner.topRight {
        left: auto;
        right: 2vw;
        transform: scaleX(-1);
    }

    .corner.bottomRight {
        top: auto;
        left: auto;
        bottom: 2vw;
        right: 2vw;
        transform: scale(-1, -1);
    }
	
	.oracle {        
        position: absolute;
        
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;        
    }

	.oracle.particle {
        background-image: url('../assets/oracle/particle.png');   
        z-index: 9;             
        height: 36vh;
        width: 90vw;

        left: 5vw;
    }

    .oracle.tree {
        background-image: url('../assets/oracle/tree.png');     
        z-index: 7;           
        height: 20vh;
        width: 25vw;

        top: 0vh;
		right: 10vw;
    }
    

	/* DESKTOP */
    @media screen and (min-width: 769px) { 
		#home {
			flex-direction: row;
			/* justify-content: space-around; */
			gap: 80px;
		}       

		#home .cover {
			width: auto;
			min-width: 40vw;
			min-height: 400px;
		}

		#panel p {
			max-width: 420px;
			font-size: 24px;
		}

		.corner {
			width: 15vw;
            height: 15vw;
		}

		.oracle.particle {           
			height: 42vh;
			width: 40vw;
			left: 0;
		}

		.oracle.tree {           
			height: 16vh;
			width: 13vw;
			top: 5vh;
			right: 0;
		}
    }
</style>