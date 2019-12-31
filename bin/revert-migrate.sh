#!/bin/bash

#=======================================================================================
#
# Resets the repos associated with the migrate feasibility prototype, see https://github.com/phetsims/chipper/issues/820
#
# Author: Sam Reid
#
#=======================================================================================

for repo in acid-base-solutions area-builder area-model-algebra area-model-decimals area-model-introduction area-model-multiplication arithmetic atomic-interactions balancing-act balancing-chemical-equations balloons-and-static-electricity beers-law-lab bending-light blackbody-spectrum blast build-a-fraction build-a-molecule build-an-atom bumper buoyancy calculus-grapher capacitor-lab-basics chains charges-and-fields circuit-construction-kit-ac circuit-construction-kit-black-box-study circuit-construction-kit-dc circuit-construction-kit-dc-virtual-lab color-vision collision-lab concentration coulombs-law curve-fitting density diffusion energy-forms-and-changes energy-skate-park energy-skate-park-basics equality-explorer equality-explorer-basics equality-explorer-two-variables estimation example-sim expression-exchange faradays-law fluid-pressure-and-flow forces-and-motion-basics fraction-comparison fraction-matcher fractions-equality fractions-intro fractions-mixed-numbers friction function-builder function-builder-basics gas-properties gases-intro gene-expression-essentials graphing-lines graphing-quadratics graphing-slope-intercept gravity-and-orbits gravity-force-lab gravity-force-lab-basics hookes-law interaction-dashboard isotopes-and-atomic-mass john-travoltage least-squares-regression make-a-ten masses-and-springs masses-and-springs-basics models-of-the-hydrogen-atom molarity molecules-and-light molecule-polarity molecule-shapes molecule-shapes-basics natural-selection neuron number-line-integers number-play ohms-law optics-lab pendulum-lab ph-scale ph-scale-basics phet-io-test-sim plinko-probability projectile-motion proportion-playground reactants-products-and-leftovers resistance-in-a-wire rutherford-scattering simula-rasa states-of-matter states-of-matter-basics trig-tour under-pressure unit-rates vector-addition vector-addition-equations wave-interference wave-on-a-string waves-intro wilder area-model-common axon brand circuit-construction-kit-common density-buoyancy-common dot fractions-common griddle inverse-square-law-common joist kite mobius nitroglycerin phetcommon phet-core phet-io scenery scenery-phet shred sun tambo tandem twixt utterance-queue vegas vibe
do
    cd ../${repo}
    git reset --hard
    cd ../chipper
done
