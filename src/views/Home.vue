<script setup>
	import { onMounted, onBeforeUnmount, ref } from 'vue';
    import { useRouter } from 'vue-router';
	import Header from '../components/Header.vue';
	import { createStarField } from '../composables/useStarField.js';
	import { play } from '../composables/useSound.js';
	import { deck } from '../data/cards.js';

    const router = useRouter();
    const root = ref(null);
    const starCanvas = ref(null);
    let starField = null;

    //Same palette as the cards in the deck
    const hoverColors = ['#E49414', '#F55F4B', '#FF7E39', '#FFF04D', '#75D090', '#46DBDD', '#B112B1'];
    const hovered = ref(null);
    const hoverColor = ref('');

    const hover = (mode) => {
        hovered.value = mode;
        hoverColor.value = hoverColors[Math.floor(Math.random() * hoverColors.length)];
    };

    //handle navigation
    const navigate = (url) => {
        play('tap');
        router.push({ path: url }); //, replace: true
    };

	onMounted(() => {
		//The night sky of the landing's oracle block: twinkling stars and the odd shooting star
		starField = createStarField(starCanvas.value, root.value, { onShoot: () => play('star') });

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		//Independent translate/scale properties: the corners are mirrored with transform and the modes lift with it
		const reveal = (selector, { y = 0, scale = 1, delay = 0, step = 0, duration = 900 }) => {
			document.querySelectorAll(selector).forEach((el, i) => el.animate(
				{ opacity: [0, 1], translate: [`0 ${y}px`, '0 0'], scale: [scale, 1] },
				{ duration, delay: delay + i * step, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
			));
		};
		reveal('.corner', { scale: 0.75, step: 180, duration: 1200 });
		reveal('#panel > p', { y: 24, delay: 200 });
		reveal('.mode', { y: 32, delay: 500, step: 150 });
	});

	onBeforeUnmount(() => starField?.destroy());
</script>

<template>
	<div class="content home">
		<Header :hasMenu="true"/>
		<main id="home" ref="root" data-cursor="yellow">
			<canvas class="star-field" ref="starCanvas"></canvas>
			<div class="corner topLeft"></div>
            <div class="corner bottomLeft"></div>
            <div class="corner topRight"></div>
            <div class="corner bottomRight"></div>

			<div id="panel">
				<p>{{ $t("praxis.praxisIntro") }}</p>

				<div class="modes">
					<!-- The full deck: a fan of cards -->
					<button class="mode"
						:class="{ active: hovered === 'deck' }"
						:style="{ '--accent': hoverColor }"
						@click="navigate('/oracle')"
						@mouseenter="hover('deck')" @mouseleave="hovered = null"
						@focus="hover('deck')" @blur="hovered = null">
						<span class="frame">
							<svg viewBox="6 26 88 72" aria-hidden="true">
								<g class="fan">
									<rect v-for="(angle, i) in [-24, -12, 0, 12, 24]" :key="angle"
										x="36" y="28" width="28" height="34" rx="6"
										:transform="`rotate(${angle} 50 92)`"
										:style="{ opacity: 0.45 + i * 0.1 }"/>
								</g>
							</svg>
						</span>
						<span class="name">{{ $t("praxis.fullDeck") }}</span>
						<span class="count">{{ $t("praxis.cardsCount", { n: deck.length }) }}</span>
					</button>

					<!-- The nine: a 3x3 grid -->
					<button class="mode"
						:class="{ active: hovered === 'nine' }"
						:style="{ '--accent': hoverColor }"
						@click="navigate('/oracleTheNine')"
						@mouseenter="hover('nine')" @mouseleave="hovered = null"
						@focus="hover('nine')" @blur="hovered = null">
						<span class="frame">
							<svg viewBox="0 0 100 100" aria-hidden="true">
								<g class="grid">
									<template v-for="row in 3" :key="row">
										<rect v-for="col in 3" :key="col"
											:x="14 + (col - 1) * 26" :y="10 + (row - 1) * 30"
											width="20" height="24" rx="4.5"/>
									</template>
								</g>
							</svg>
						</span>
						<span class="name">{{ $t("praxis.theNine") }}</span>
						<span class="count">{{ $t("praxis.cardsCount", { n: 9 }) }}</span>
					</button>
				</div>
			</div>
		</main>
	</div>
</template>

<style scoped>
	.content.home {
		background-color: #143246;
		height: auto;
		min-height: 100vh;
	}

	#home {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
	}

	.star-field {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		pointer-events: none;
		opacity: 0;
		transition: opacity 1.2s ease-out;
	}

	#panel {
        display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 48px;
		padding: 80px 0;
    }

    #panel p {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        font-size: 22px;
        line-height: 150%;
        letter-spacing: 0.02em;
        margin: 0;
        text-align: center;

		width: 90vw;
		max-width: 370px;
		color: #F7F8F1;
		filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.6));
    }

	/* MODE SELECTOR */
	.modes {
		display: flex;
		justify-content: center;
		gap: 20px;
	}

	/* Resets the global button look: these are cards, not buttons */
	.mode {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		width: 142px;
		height: auto;
		padding: 0;
		border-radius: 0;
		background: transparent;
		color: #F7F8F1;
		font-family: 'Inter', helvetica, sans-serif;
		--accent: rgba(252, 252, 252, 0.42);
		transition: transform 250ms ease-out;
	}

	.mode:hover,
	.mode:focus {
		background: transparent;
		color: #F7F8F1;
		box-shadow: none;
	}

	.mode:focus-visible {
		outline: 2px solid #E6E973;
		outline-offset: 6px;
		border-radius: 20px;
	}

	.mode.active {
		transform: translateY(-6px);
	}

	.mode .frame {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 100%;
		aspect-ratio: 1 / 1.2;
		border: 2px solid rgba(252, 252, 252, 0.42);
		border-radius: 20px;
		background: rgba(20, 50, 70, 0.55);
		filter: drop-shadow(0px 2px 3px rgb(234, 234, 234));
		transition: border-color 250ms ease-out, filter 250ms ease-out;
	}

	.mode.active .frame {
		border-color: var(--accent);
		filter: drop-shadow(0px 2px 6px var(--accent));
	}

	.mode svg {
		width: 78%;
		height: 78%;
		overflow: visible;
	}

	.mode svg rect {
		fill: #143246;
		stroke: #F7F8F1;
		stroke-width: 2.2;
		transition: stroke 250ms ease-out;
	}

	.mode.active svg rect {
		stroke: var(--accent);
	}

	.mode .name {
		margin-top: 10px;
		font-family: 'particular', 'Inter', helvetica, sans-serif;
		font-size: 22px;
		line-height: 1.1;
		letter-spacing: 0.02em;
		color: #F7F8F1;
	}

	.mode .count {
		font-size: 14px;
		color: #F7F8F1;
		opacity: 0.7;
	}

	/* CORNERS */
	.corner {
        background-image: url('../assets/oracle/corner.webp');
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

	/* DESKTOP */
    @media screen and (min-width: 769px) {
		#panel p {
			max-width: 460px;
			font-size: 26px;
		}

		.mode {
			width: 168px;
		}

		.corner {
			width: 15vw;
            height: 15vw;
		}
    }

	@media (prefers-reduced-motion: reduce) {
		.mode,
		.mode .frame {
			transition: none;
		}
	}
</style>
